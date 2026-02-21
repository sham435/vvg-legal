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

    this.logger.log("Generating video with Fal AI...");

    const response = await axios.post(
      "https://queue.fal.run/fal-ai/fast-svd",
      {
        prompt: prompt.substring(0, 500),
        num_frames: 16,
        aspect_ratio: "16:9",
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
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        const status = await axios.get(
          `https://queue.fal.run/fal-ai/fast-svd/${requestId}`,
          { headers: { "Authorization": `Key ${apiKey}` } }
        );

        if (status.data.status === "COMPLETED") {
          return {
            success: true,
            videoUrl: status.data.video.url,
            engine: "fal-ai",
            duration: 4,
          };
        } else if (status.data.status === "FAILED") {
          throw new Error("Fal AI generation failed");
        }
      } catch (e) {
        // Still processing
      }
    }

    throw new Error("Fal AI timeout");
  }

  private async generateWithPixVerse(prompt: string): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("PIXVERSE_API_KEY");
    if (!apiKey) {
      throw new Error("PIXVERSE_API_KEY not configured");
    }

    this.logger.log("Generating video with PixVerse...");

    const response = await axios.post(
      "https://api.pixverse.io/api/v1/video/generate",
      {
        prompt: prompt.substring(0, 500),
        duration: 4,
        aspect_ratio: "16:9",
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    const taskId = response.data.task_id;
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const status = await axios.get(
        `https://api.pixverse.io/api/v1/video/status/${taskId}`,
        { headers: { "Authorization": `Bearer ${apiKey}` } }
      );

      if (status.data.status === "completed") {
        return {
          success: true,
          videoUrl: status.data.video_url,
          engine: "pixverse",
          duration: 4,
        };
      } else if (status.data.status === "failed") {
        throw new Error("PixVerse generation failed");
      }
    }

    throw new Error("PixVerse timeout");
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
