import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TrendsService } from "../trends/trends.service";
import { AiService } from "../ai/ai.service";
import { VideoService } from "../video/video.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CronJob } from "cron";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isAutoGenerationEnabled = false;
  private requiresManualApproval = true;
  // Path to the shared videos.json file
  private readonly videoDbPath =
    "/Users/sham4/Antigravity/vvg/viral-video-generator/backend/outputs/videos.json";

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly trendsService: TrendsService,
    private readonly aiService: AiService,
    private readonly videoService: VideoService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    // Load settings from config
    this.isAutoGenerationEnabled =
      this.config.get<string>("ENABLE_AUTO_GENERATION") === "true";
    this.requiresManualApproval =
      this.config.get<string>("REQUIRE_MANUAL_APPROVAL") === "true";
  }

  /**
   * Helper to append job to specific JSON file
   */
  private queueJobInFile(
    topic: any,
    customPrompt?: string,
    fullScript?: string,
  ) {
    try {
      let videos = [];
      if (fs.existsSync(this.videoDbPath)) {
        const content = fs.readFileSync(this.videoDbPath, "utf8");
        try {
          videos = JSON.parse(content);
        } catch (e) {
          this.logger.warn("videos.json corrupted, resetting");
          videos = [];
        }
      }

      // Use custom prompt (from AI script) or fallback to basic topic info
      const finalPrompt =
        customPrompt || `Video about ${topic.title}: ${topic.description}`;

      const newJob = {
        id: uuidv4(),
        filename: `cog_${uuidv4()}.mp4`,
        prompt: finalPrompt,
        script: fullScript || "", // Store full script for TTS/Review
        frames: 8,
        status: "queued",
        engine: "cogvideox",
        created_at: new Date().toISOString(),
        params: {
          steps: 50,
          guidance: 6.0,
          seed: 42,
        },
        // Store origin topic info for reference
        metadata: {
          topicId: topic.id,
          title: topic.title,
          source: topic.source,
        },
      };

      videos.push(newJob);
      fs.writeFileSync(this.videoDbPath, JSON.stringify(videos, null, 2));
      this.logger.log(
        `✅ Job queued: ${newJob.filename} (Prompt: ${finalPrompt.substring(0, 50)}...)`,
      );
    } catch (error) {
      this.logger.error(`Failed to queue job in file: ${error.message}`);
      throw error;
    }
  }

  // --- Cron Control Methods ---

  isCronActive(): boolean {
    try {
      const job = this.schedulerRegistry.getCronJob("hourly-generation");
      return job.running;
    } catch (e) {
      return false;
    }
  }

  getStatus() {
    const running = this.isCronActive();
    // In a real app we might track lastRun time in a variable or DB
    return {
      running,
      lastRun: new Date(), // Placeholder or implement actual tracking
      nextRun: running
        ? this.schedulerRegistry
            .getCronJob("hourly-generation")
            .nextDate()
            .toJSDate()
        : null,
    };
  }

  stopCron() {
    try {
      const job = this.schedulerRegistry.getCronJob("hourly-generation");
      job.stop();
      this.logger.log("Stopped hourly video generation cron job");
      return { message: "Scheduler stopped" };
    } catch (e) {
      this.logger.warn("Could not stop cron job: " + e.message);
      return { message: "Failed to stop scheduler: " + e.message };
    }
  }

  startCron() {
    try {
      const job = this.schedulerRegistry.getCronJob("hourly-generation");
      job.start();
      this.logger.log("Started hourly video generation cron job");
      return { message: "Scheduler started" };
    } catch (e) {
      this.logger.warn("Could not start cron job: " + e.message);
      return { message: "Failed to start scheduler: " + e.message };
    }
  }

  restart() {
    this.stopCron();
    this.startCron();
    return { message: "Scheduler restarted" };
  }
  /**
   * Hourly cron job to generate viral videos
   */
  @Cron(CronExpression.EVERY_HOUR, { name: "hourly-generation" })
  async handleHourlyVideoGeneration() {
    if (!this.isAutoGenerationEnabled) {
      this.logger.log("Auto-generation disabled, skipping");
      return;
    }

    this.logger.log("🎬 Starting hourly video generation...");

    try {
      // 1. Fetch fresh trending topics
      await this.trendsService.saveTrendingTopics();

      // 2. Get best unused topic
      const topic = await this.trendsService.getBestUnusedTopic();

      if (!topic) {
        this.logger.warn("No unused trending topics available");
        return;
      }

      // 3. Generate AI Script & Visual Prompt
      this.logger.log(`🤖 Generating script for topic: ${topic.title}`);
      let visualPrompt = "";
      let fullScriptText = "";

      try {
        // Add a timeout to avoid hanging forever if OpenAI is slow
        const script = await this.aiService.generateScript(
          topic.title,
          topic.description,
        );

        if (script) {
          // Basic text representation of the script for now (or store JSON if field allows)
          // Converting structured script to text for simple storage
          fullScriptText = JSON.stringify(script);
        }

        // Strategy: Use the visual prompt from the first scene for the video generation
        // (CogVideoX generates short clips, so Scene 1 is appropriate)
        if (script.scenes && script.scenes.length > 0) {
          visualPrompt = script.scenes[0].visualPrompt;

          // If visual prompt is too short, append style
          if (visualPrompt.length < 50) {
            visualPrompt +=
              ", cinematic lighting, 4k, trending on artstation, photorealistic";
          }
        }
      } catch (aiError) {
        this.logger.error(
          `AI Script generation failed: ${aiError.message}. Falling back to basic prompt.`,
        );
        // visualPrompt stays empty, queueJobInFile handles fallback
      }

      // 4. Queue Job with customized prompt AND full script
      this.queueJobInFile(topic, visualPrompt, fullScriptText);

      // Mark topic as used
      await this.trendsService.markTopicAsUsed(topic.id);
    } catch (error) {
      this.logger.error("Hourly generation failed", error);
      await this.notificationsService.sendErrorAlert(
        "Hourly video generation failed",
        error.message,
      );
    }
  }

  /**
   * Daily analytics sync
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyAnalyticsSync() {
    this.logger.log("📊 Syncing analytics...");
    // This will be triggered from analytics module
  }

  /**
   * Trigger manual video generation
   */
  async triggerManualGeneration(topicId?: string) {
    let topic;

    if (topicId) {
      topic = await this.prisma.trendingTopic.findUnique({
        where: { id: topicId },
      });
    } else {
      topic = await this.trendsService.getBestUnusedTopic();
    }

    if (!topic) {
      throw new Error("No topic available");
    }

    // Manual triggers ALSO go through the AI Script flow
    this.logger.log(`🤖 Manual trigger: Generating script for ${topic.title}`);
    let visualPrompt = "";
    let fullScriptText = "";

    try {
      const script = await this.aiService.generateScript(
        topic.title,
        topic.description,
      );
      if (script) {
        fullScriptText = JSON.stringify(script);
      }
      if (script.scenes && script.scenes.length > 0) {
        visualPrompt = script.scenes[0].visualPrompt;
        if (visualPrompt.length < 50) {
          visualPrompt += ", cinematic lighting, 4k, highly detailed";
        }
      }
    } catch (e) {
      this.logger.warn(`AI gen failed for manual trigger: ${e.message}`);
    }

    this.queueJobInFile(topic, visualPrompt, fullScriptText);

    return { message: "Video generation queued", topicId: topic.id };
  }

  /**
   * Update scheduler settings
   */
  /**
   * Update a video job in the file
   */
  public updateJobInFile(filename: string, updates: Record<string, any>) {
    try {
      if (!fs.existsSync(this.videoDbPath)) return false;

      const data = fs.readFileSync(this.videoDbPath, "utf8");
      let jobs = JSON.parse(data);

      let updated = false;
      jobs = jobs.map((job: any) => {
        if (job.filename === filename) {
          updated = true;
          return { ...job, ...updates };
        }
        return job;
      });

      if (updated) {
        fs.writeFileSync(this.videoDbPath, JSON.stringify(jobs, null, 2));
        this.logger.log(`Updated job ${filename}: ${JSON.stringify(updates)}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to update job ${filename}`, error);
      return false;
    }
  }

  // Path to settings file
  private readonly settingsPath =
    "/Users/sham4/Antigravity/vvg/viral-video-generator/backend/outputs/settings.json";

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = JSON.parse(fs.readFileSync(this.settingsPath, "utf8"));
        if (data.enableAutoGeneration !== undefined)
          this.isAutoGenerationEnabled = data.enableAutoGeneration;
        if (data.requireManualApproval !== undefined)
          this.requiresManualApproval = data.requireManualApproval;
      }
    } catch (e) {
      this.logger.error("Failed to load settings.json", e);
    }
  }

  private saveSettings() {
    try {
      const data = {
        enableAutoGeneration: this.isAutoGenerationEnabled,
        requireManualApproval: this.requiresManualApproval,
      };
      fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
    } catch (e) {
      this.logger.error("Failed to save settings.json", e);
    }
  }

  /**
   * Update scheduler settings
   */
  async updateSettings(settings: {
    enableAutoGeneration?: boolean;
    requireManualApproval?: boolean;
  }) {
    if (settings.enableAutoGeneration !== undefined) {
      this.isAutoGenerationEnabled = settings.enableAutoGeneration;
    }

    if (settings.requireManualApproval !== undefined) {
      this.requiresManualApproval = settings.requireManualApproval;
    }

    this.saveSettings();

    return {
      enableAutoGeneration: this.isAutoGenerationEnabled,
      requireManualApproval: this.requiresManualApproval,
    };
  }

  onModuleInit() {
    this.loadSettings();
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enableAutoGeneration: this.isAutoGenerationEnabled,
      requireManualApproval: this.requiresManualApproval,
    };
  }
}
