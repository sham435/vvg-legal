import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  engine: string;
  duration?: number;
}

@Injectable()
export class PixverseEngine {
  private readonly logger = new Logger(PixverseEngine.name);
  private readonly apiKey: string;
  private readonly apiUrl = "https://app-api.pixverse.io/openapi/v2";
  private isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("PIXVERSE_API_KEY");
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      this.logger.warn("⚠️ PIXVERSE_API_KEY not configured. PixVerse engine unavailable.");
    } else {
      this.logger.log("✅ PixVerse engine initialized");
    }
  }

  async generateVideo(prompt: string, options: any = {}): Promise<VideoGenerationResult> {
    if (!this.isConfigured) {
      throw new Error("PIXVERSE_API_KEY not configured");
    }

    this.logger.log(`🎬 Generating video with PixVerse v5.6: ${prompt.substring(0, 50)}...`);

    try {
      const response = await axios.post(
        `${this.apiUrl}/video/text/generate`,
        {
          prompt: prompt.substring(0, 500),
          aspect_ratio: options.aspectRatio || "16:9",
          duration: options.duration || 5,
          model: "v5.6",
          negative_prompt: options.negativePrompt || "blurry, low quality, distorted, ugly",
          turbo_mode: options.turbo !== false,
        },
        {
          headers: {
            "API-KEY": this.apiKey,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        },
      );

      const taskId = response.data?.data?.task_id || response.data?.task_id;
      if (!taskId) {
        throw new Error("No task_id returned from PixVerse");
      }

      this.logger.log(`PixVerse task submitted: ${taskId}`);

      // Poll for completion
      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        try {
          const status = await axios.get(
            `${this.apiUrl}/video/status/${taskId}`,
            { headers: { "API-KEY": this.apiKey } },
          );

          const statusData = status.data?.data || status.data;

          if (statusData?.status === "success" || statusData?.status === "completed") {
            return {
              success: true,
              videoUrl: statusData?.video_url || statusData?.video?.url,
              engine: "pixverse-v5.6",
              duration: options.duration || 5,
            };
          } else if (statusData?.status === "failed" || statusData?.status === "error") {
            throw new Error(statusData?.message || "PixVerse generation failed");
          }
        } catch (e) {
          // Continue polling
        }
      }

      throw new Error("PixVerse generation timed out");
    } catch (error: any) {
      this.logger.error(`❌ PixVerse failed: ${error.message}`);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await axios.get(this.apiUrl.replace("/openapi/v2", "/health"), {
        headers: { "API-KEY": this.apiKey },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }
}
