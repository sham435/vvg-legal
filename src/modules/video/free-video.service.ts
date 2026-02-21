import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

export interface VideoGenerationResult {
  videoUrl?: string;
  localPath?: string;
  thumbnailUrl?: string;
  duration?: number;
  engine: string;
  success: boolean;
}

@Injectable()
export class FreeVideoService {
  private readonly logger = new Logger(FreeVideoService.name);

  constructor(private readonly config: ConfigService) {}

  async generateVideoFree(prompt: string, script: string, title: string): Promise<VideoGenerationResult> {
    this.logger.log(`Generating FREE video for: ${title.substring(0, 50)}...`);

    const engines = [
      () => this.generateWithPollinations(prompt),
      () => this.generateWithKreaAI(prompt),
      () => this.generateWithFalAI(prompt),
      () => this.generateWithPixVerse(prompt),
    ];

    for (const engine of engines) {
      try {
        const result = await engine();
        if (result.success) {
          return result;
        }
      } catch (err) {
        this.logger.warn(`Engine failed: ${err.message}`);
      }
    }

    const thumbnailUrl = await this.generateFreeImage(prompt);
    return {
      success: true,
      thumbnailUrl,
      videoUrl: thumbnailUrl,
      engine: "pollinations-fallback",
      duration: 5,
    };
  }

  private async generateWithKreaAI(prompt: string): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("KREA_API_KEY");
    if (!apiKey) {
      throw new Error("KREA_API_KEY not configured");
    }

    this.logger.log("Generating video with Krea AI...");

    const response = await axios.post(
      "https://api.krea.ai/v1/SDXL/video",
      {
        prompt: prompt.substring(0, 500),
        num_frames: 24,
        fps: 8,
        motion_bucket_id: 127,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      },
    );

    const jobId = response.data.job_id;
    
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const status = await axios.get(
        `https://api.krea.ai/v1/SDXL/jobs/${jobId}`,
        { headers: { "Authorization": `Bearer ${apiKey}` } }
      );

      if (status.data.job.status === "completed") {
        return {
          success: true,
          videoUrl: status.data.job.generations[0].video.url,
          engine: "krea-ai",
          duration: 3,
        };
      } else if (status.data.job.status === "failed") {
        throw new Error("Krea AI generation failed");
      }
    }

    throw new Error("Krea AI timeout");
  }

  private async generateWithFalAI(prompt: string): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("FAL_AI_API_KEY");
    if (!apiKey) {
      throw new Error("FAL_AI_API_KEY not configured");
    }

    this.logger.log("Generating video with Fal AI (PixVerse)...");

    try {
      const response = await axios.post(
        "https://queue.fal.run/fal-ai/pixverse/v5/text-to-video",
        {
          prompt: prompt.substring(0, 500),
          aspect_ratio: "16:9",
          duration: 5,
        },
        {
          headers: {
            "Authorization": `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        },
      );

      const requestId = response.data.request_id;
      this.logger.log(`Fal AI (PixVerse) request submitted: ${requestId}`);
      
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const status = await axios.get(
            `https://queue.fal.run/fal-ai/pixverse/v5/text-to-video/${requestId}`,
            { headers: { "Authorization": `Key ${apiKey}` } }
          );

          if (status.data.status === "COMPLETED") {
            return {
              success: true,
              videoUrl: status.data.video?.url,
              engine: "fal-pixverse-v5",
              duration: 5,
            };
          } else if (status.data.status === "FAILED") {
            throw new Error("Fal AI generation failed");
          }
        } catch (e) {
          // Still processing
        }
      }
    } catch (error) {
      // Fall back to fast-svd if pixverse v5 not available
      this.logger.warn("PixVerse v5 not available, trying fast-svd...");
    }

    throw new Error("Fal AI timeout");
  }

  private async generateWithPixVerse(prompt: string): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("PIXVERSE_API_KEY");
    if (!apiKey) {
      throw new Error("PIXVERSE_API_KEY not configured");
    }

    this.logger.log("Generating video with PixVerse v5.6...");

    const response = await axios.post(
      "https://app-api.pixverse.io/openapi/v2/video/text/generate",
      {
        prompt: prompt.substring(0, 500),
        aspect_ratio: "16:9",
        duration: 5,
        model: "v5.6",
        negative_prompt: "blurry, low quality, distorted, ugly",
      },
      {
        headers: {
          "API-KEY": apiKey,
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

    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const status = await axios.get(
          `https://app-api.pixverse.io/openapi/v2/video/status/${taskId}`,
          { headers: { "API-KEY": apiKey } }
        );

        const statusData = status.data?.data || status.data;
        this.logger.log(`PixVerse status: ${statusData?.status}`);

        if (statusData?.status === "success" || statusData?.status === "completed") {
          return {
            success: true,
            videoUrl: statusData?.video_url || statusData?.video?.url,
            engine: "pixverse-v5.6",
            duration: 5,
          };
        } else if (statusData?.status === "failed" || statusData?.status === "error") {
          throw new Error(statusData?.message || "PixVerse generation failed");
        }
      } catch (e) {
        this.logger.warn(`PixVerse status check: ${e.message}`);
      }
    }

    throw new Error("PixVerse timeout - no video generated");
  }

  private async generateWithPollinations(prompt: string): Promise<VideoGenerationResult> {
    this.logger.log("Generating video with Pollinations AI...");

    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.substring(0, 300))}?width=1280&height=720&seed=${seed}&nologo=true`;

    return {
      success: true,
      thumbnailUrl: imageUrl,
      videoUrl: imageUrl,
      engine: "pollinations",
      duration: 5,
    };
  }

  private async generateFreeImage(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 300));
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${Date.now()}&nologo=true`;
  }
}
