import { Injectable, Logger } from "@nestjs/common";
import { VideoScript, AiService } from "../../modules/ai/ai.service";
import { VideoService } from "../../modules/video/video.service";
import { VideoMetricsService } from "../../monitoring/video-metrics.service";

@Injectable()
export class PipelineCoordinatorService {
  private readonly logger = new Logger(PipelineCoordinatorService.name);

  constructor(
    private readonly videoService: VideoService,
    private readonly aiService: AiService,
    private readonly metricsService: VideoMetricsService,
  ) {}

  /**
   * EXECUTE ZERO-TOUCH PIPELINE
   * Takes a fully evolved script and turns it into a final video file.
   *
   * Flow:
   * 1. Log Start
   * 2. (Optional) Enhance Visual Descriptions (if not detailed enough)
   * 3. Send to VideoService (which prioritizes Wan 1.3B / LTX as per config)
   * 4. Record Metrics
   */
  async executePipeline(script: VideoScript, jobId: string) {
    this.logger.log(`🚀 Starting Zero-Touch Pipeline for Job ${jobId}`);

    const startTime = Date.now();

    try {
      // Step 1: Prepare Generation Request
      // Map the "Script Scenes" to the "Prompt Structure" required by VideoService
      // Assuming videoService.generateVideo takes a prompt string or object
      // For standard "Generate Video from Text", we might iterate scene by scene or do a full concatenation

      // For simplicity in this iteration, we generate for the HOOK first (Vital for metrics)
      const hookPrompt = `Cinematic YouTube Short, ${script.hook}. High quality, 4k, trending style.`;

      this.logger.log(
        `Generating Hook Video using configured defaults (Wan 1.3B / LTX)...`,
      );

      // Note: VideoService automatically picks the best engine (Wan 1.3B) based on config
      // Skip pre-generation scoring here since script is already evolved and scored
      const output = await this.videoService.generateVideo(
        hookPrompt,
        5,
        script.title,
        true,
      );

      // Step 2: Metrics
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordGeneration(true, duration);
      this.logger.log(
        `✅ Pipeline Success! Video saved at: ${output.localPath || output.videoUrl}`,
      );

      return output;
    } catch (error) {
      this.logger.error(`❌ Pipeline Failed for Job ${jobId}`, error);
      this.metricsService.recordGeneration(false, 0);
      throw error;
    }
  }
}
