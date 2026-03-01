import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { VideoGenerationOptions, VideoEngineResponse } from "../interfaces/video.interface";

@Injectable()
export class Sora2Service {
  private readonly logger = new Logger(Sora2Service.name);
  private readonly apiKey: string;
  private readonly apiUrl = "https://api.aimlapi.com/v1";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("AIMLAPI_KEY", "af025965b5774972852c67e60e9315cc");
    if (!this.apiKey) {
      this.logger.warn("AIMLAPI_KEY not configured - Sora2 will not work");
    } else {
      this.logger.log("Sora2 service initialized with API key");
    }
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoEngineResponse> {
    this.logger.log(`Generating video with Sora 2: ${options.prompt?.substring(0, 50)}...`);

    try {
      const submissionResponse = await this.submitGeneration(options);

      if (!submissionResponse.id) {
        throw new Error("No job ID returned from Sora 2 API");
      }

      this.logger.log(`Sora 2 job submitted: ${submissionResponse.id}`);

      const maxAttempts = 30;
      const pollInterval = 10000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        this.logger.log(`Polling Sora 2 job ${submissionResponse.id} (attempt ${attempt}/${maxAttempts})`);

        const statusResponse = await this.checkStatus(submissionResponse.id);

        if (statusResponse.status === "completed" || statusResponse.status === "succeeded") {
          const videoUrl = statusResponse.output?.url || statusResponse.output?.video_url;
          this.logger.log(`Sora 2 job completed successfully: ${submissionResponse.id}`);

          return {
            success: true,
            videoUrl: videoUrl,
            metadata: {
              jobId: submissionResponse.id,
              engine: "sora2",
              duration: statusResponse.metadata?.duration || options.duration,
            },
          };
        } else if (statusResponse.status === "failed") {
          this.logger.error(`Sora 2 job failed: ${submissionResponse.id} - ${statusResponse.error}`);
          return {
            success: false,
            error: statusResponse.error || "Video generation failed",
            metadata: { jobId: submissionResponse.id, engine: "sora2" },
          };
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      this.logger.error(`Sora 2 job timed out: ${submissionResponse.id}`);
      return {
        success: false,
        error: "Video generation timed out",
        metadata: { jobId: submissionResponse.id, engine: "sora2" },
      };
    } catch (error) {
      this.logger.error(`Sora 2 generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
        metadata: { engine: "sora2" },
      };
    }
  }

  private async submitGeneration(options: VideoGenerationOptions): Promise<any> {
    const prompt = this.buildPrompt(options);

    const payload: any = {
      model: "sora-2-text-to-video",
      prompt: prompt,
      response_format: "url",
    };

    if (options.duration) {
      payload.duration = Math.min(Math.max(options.duration, 5), 60);
    }

    const aspectRatio = options.aspectRatio || "16:9";
    if (aspectRatio === "16:9") {
      payload.size = "1920x1080";
    } else if (aspectRatio === "9:16") {
      payload.size = "1080x1920";
    } else if (aspectRatio === "1:1") {
      payload.size = "1080x1080";
    }

    this.logger.log(`Submitting to ${this.apiUrl}/video/generations`);

    try {
      const response = await axios.post(`${this.apiUrl}/video/generations`, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      this.logger.error(`Failed to submit Sora 2 job: ${JSON.stringify(error.response?.data || errorMsg)}`);
      throw new Error(`Sora 2 API submission failed: ${errorMsg}`);
    }
  }

  private async checkStatus(jobId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/video/generations/${jobId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check Sora 2 job status: ${error.message}`);
      throw error;
    }
  }

  private buildPrompt(options: VideoGenerationOptions): string {
    const parts = [];

    if (options.prompt) {
      parts.push(options.prompt);
    }

    if (options.style) {
      parts.push(`Style: ${options.style}`);
    }

    if (options.mood) {
      parts.push(`Mood: ${options.mood}`);
    }

    if (options.cameraMovement) {
      parts.push(`Camera movement: ${options.cameraMovement}`);
    }

    if (options.lighting) {
      parts.push(`Lighting: ${options.lighting}`);
    }

    return parts.join(". ");
  }

  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Received Sora 2 webhook: ${JSON.stringify(payload)}`);
  }
}
