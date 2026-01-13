import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TrendsService } from "../trends/trends.service";
import { AiService } from "../ai/ai.service";
import { VideoService } from "../video/video.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PipelineService } from "../pipeline/pipeline.service";
import { PublishService } from "../publish/publish.service";
import { Article } from "../news/news.service";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private isAutoGenerationEnabled = false;
  private requiresManualApproval = true;
  // Path to the shared videos.json file
  private readonly videoDbPath = path.join(
    process.cwd(),
    "outputs",
    "videos.json"
  );
  private lastError: string | null = null;
  private lastRunTime: Date | null = null;
  // Path to settings file
  private readonly settingsPath = path.join(
    process.cwd(),
    "outputs",
    "settings.json"
  );

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly trendsService: TrendsService,
    private readonly aiService: AiService,
    private readonly videoService: VideoService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly pipelineService: PipelineService,
    private readonly publishService: PublishService
  ) {
    // Initial load from environment variables
    this.isAutoGenerationEnabled =
      this.config.get<string>("ENABLE_AUTO_GENERATION") === "true";
    this.requiresManualApproval =
      this.config.get<string>("REQUIRE_MANUAL_APPROVAL", "true") === "true";
  }

  /**
   * Helper to append job to specific JSON file
   */
  private queueJobInFile(
    topic: any,
    customPrompt?: string,
    fullScript?: string
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
        `✅ Job queued: ${newJob.filename} (Prompt: ${finalPrompt.substring(0, 50)}...)`
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
    return {
      running,
      autoGenerationEnabled: this.isAutoGenerationEnabled,
      requiresManualApproval: this.requiresManualApproval,
      lastRun: this.lastRunTime,
      lastError: this.lastError,
      nextRun: running
        ? this.schedulerRegistry
            .getCronJob("hourly-generation")
            .nextDate()
            .toJSDate()
        : null,
    };
  }

  async getDiagnostics() {
      const unusedTopics = await this.trendsService.getAllTopics(5, false);
      const latestVideos = await this.prisma.video.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
      const youtubeConfigured = !!(this.config.get("YOUTUBE_CLIENT_ID") && this.config.get("YOUTUBE_REFRESH_TOKEN"));
      const nvidiaConfigured = !!(this.config.get("NVIDIA_API_KEY") || this.config.get("OPENROUTER_API_KEY"));
      const newsApiConfigured = !!this.config.get("NEWS_API_KEY");
      
      const counts = {
          pendingVideos: await this.prisma.video.count({ where: { status: 'PENDING' } }),
          publishedVideos: await this.prisma.video.count({ where: { status: 'PUBLISHED' } }),
          failedVideos: await this.prisma.video.count({ where: { status: 'FAILED' } }),
          unusedTopics: unusedTopics.length,
          totalPublishLogs: await this.prisma.publishLog.count(),
      };

      return {
          system: {
              autoGenerationEnabled: this.isAutoGenerationEnabled,
              youtubeConfigured,
              nvidiaConfigured,
              newsApiConfigured,
          },
          tracking: {
              lastRunTime: this.lastRunTime,
              lastError: this.lastError,
          },
          counts,
          latestVideos: latestVideos.map(v => ({ id: v.id, title: v.title, status: v.status })),
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
    this.logger.log("🎬 [Internal Scheduler] Checking if auto-generation is enabled...");
    
    if (!this.isAutoGenerationEnabled) {
      this.logger.log("⏸️ [Internal Scheduler] Auto-generation is currently DISABLED (ENABLE_AUTO_GENERATION=false). Skipping check.");
      return;
    }

    this.logger.log("🎬 [Internal Scheduler] Auto-generation is ENABLED. Starting process...");

    try {
      // 1. Fetch fresh trending topics
      await this.trendsService.saveTrendingTopics();

      // 2. Get best unused topic
      const topic = await this.trendsService.getBestUnusedTopic();

      if (!topic) {
        this.logger.warn("No unused trending topics available");
        return;
      }

      this.logger.log(`🤖 Automated Pipeline: Running for topic: ${topic.title}`);

      // 3. Run the full pipeline
      const article: Article = {
          title: topic.title,
          description: topic.description,
          url: topic.url,
      };

      const result = await this.pipelineService.runPipeline(article);
      this.lastRunTime = new Date();
      this.lastError = null;
      this.logger.log(`✅ Automated Pipeline Finished: ${result.type}, Title: ${result.title}`);
      
      if (result.type === 'video' && result.localPath) {
          this.logger.log(`🚀 Automated Upload should be complete for: ${result.title}`);
      } else if (result.type === 'article') {
          this.logger.warn(`⚠️ Pipeline fell back to Article mode. No video was generated/uploaded.`);
      }

      // Mark topic as used
      await this.trendsService.markTopicAsUsed(topic.id);
    } catch (error) {
      this.lastError = error.message;
      this.logger.error("Hourly generation failed", error);
      await this.notificationsService.sendErrorAlert(
        "Hourly video generation failed",
        error.message
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

    this.logger.log(`🤖 Manual trigger: Running pipeline for ${topic.title}`);
    
    const article: Article = {
        title: topic.title,
        description: topic.description,
        url: topic.url,
    };

    const result = await this.pipelineService.runPipeline(article);
    return { message: "Video generation complete", type: result.type, videoUrl: result.url };
  }

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

  private loadSettings() {
    // Priority 1: Environment Variables
    const envAutoGen = this.config.get<string>("ENABLE_AUTO_GENERATION");
    if (envAutoGen !== undefined) {
        this.isAutoGenerationEnabled = envAutoGen === "true";
    }

    const envManualApprove = this.config.get<string>("REQUIRE_MANUAL_APPROVAL");
    if (envManualApprove !== undefined) {
        this.requiresManualApproval = envManualApprove === "true";
    }

    // Priority 2: JSON Settings (only if not already set by ENV)
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = JSON.parse(fs.readFileSync(this.settingsPath, "utf8"));
        
        if (envAutoGen === undefined && data.enableAutoGeneration !== undefined) {
          this.isAutoGenerationEnabled = data.enableAutoGeneration;
        }

        if (envManualApprove === undefined && data.requireManualApproval !== undefined) {
          this.requiresManualApproval = data.requireManualApproval;
        }
      }
    } catch (e) {
      this.logger.error("Failed to load settings.json (continuing with existing)", e);
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
