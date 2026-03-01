import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Json2VideoService } from "../video/json2video.service";

export interface ThumbnailOptions {
  aspectRatio?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  stylize?: number;
  quality?: number;
  forceOfficial?: boolean;
}

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly json2VideoService: Json2VideoService,
  ) {
    if (!this.json2VideoService.isConfigured()) {
      this.logger.warn(
        "⚠️ JSON2VIDEO_API_KEY not configured. Using fallback placeholder images.",
      );
    } else {
      this.logger.log("✅ ThumbnailService initialized with JSON2Video");
    }
  }

  async generateThumbnail(prompt: string, options: ThumbnailOptions = {}) {
    const startTime = Date.now();

    this.logger.log(`Generating thumbnail: "${prompt.substring(0, 50)}..."`);

    try {
      if (!this.json2VideoService.isConfigured()) {
        throw new Error("JSON2VIDEO_API_KEY not configured");
      }

      const { width, height } = this.getDimensions(options.aspectRatio, options.width, options.height);

      const movieId = await this.json2VideoService.generateThumbnail(prompt, {
        width,
        height,
        backgroundColor: options.backgroundColor || "#1a1a2e",
        textColor: options.textColor || "#ffffff",
        fontSize: options.fontSize || 60,
      });

      const generationTime = Date.now() - startTime;

      this.logger.log(`Thumbnail generated successfully in ${generationTime}ms`);

      return {
        jobId: movieId,
        status: "completed",
        message: "Thumbnail generation submitted",
        imageUrl: movieId,
        thumbnailUrl: movieId,
        progress: 100,
        generationTime,
        provider: "json2video",
      };
    } catch (error) {
      this.logger.error(`Thumbnail generation failed: ${error.message}`);

      const placeholderUrl = `https://via.placeholder.com/1280x720/1a1a2e/ffffff?text=${encodeURIComponent(prompt.substring(0, 30))}`;

      return {
        jobId: "fallback",
        status: "fallback",
        message: "Using placeholder due to API error",
        imageUrl: placeholderUrl,
        thumbnailUrl: placeholderUrl,
        progress: 100,
        generationTime: Date.now() - startTime,
        provider: "placeholder",
      };
    }
  }

  async getThumbnailStatus(jobId: string) {
    this.logger.log(`Checking thumbnail job status: ${jobId}`);

    if (jobId === "fallback") {
      return {
        jobId,
        status: "completed",
        message: "Placeholder image",
      };
    }

    try {
      const status = await this.json2VideoService.checkStatus(jobId);
      return {
        jobId,
        status: status?.status || "unknown",
        message: status?.message || "",
      };
    } catch (error) {
      this.logger.error(`Failed to get thumbnail status: ${error.message}`);
      throw new HttpException(
        {
          code: "STATUS_CHECK_FAILED",
          message: "Failed to retrieve thumbnail job status",
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async generateChannelArt(title: string, channelName: string): Promise<string> {
    try {
      if (!this.json2VideoService.isConfigured()) {
        return `https://via.placeholder.com/2560x1440/1a1a2e/ffffff?text=${encodeURIComponent(channelName)}`;
      }

      return await this.json2VideoService.generateThumbnail(`${channelName}\n${title}`, {
        width: 2560,
        height: 1440,
        fontSize: 80,
      });
    } catch (error) {
      this.logger.error(`Failed to generate channel art: ${error.message}`);
      return `https://via.placeholder.com/2560x1440/1a1a2e/ffffff?text=${encodeURIComponent(channelName)}`;
    }
  }

  async generateScenePreviews(scenes: any[]): Promise<string[]> {
    const previews: string[] = [];

    for (let i = 0; i < Math.min(scenes.length, 3); i++) {
      const scene = scenes[i];
      try {
        const preview = await this.generateThumbnail(scene.narration || `Scene ${i + 1}`, {
          width: 640,
          height: 360,
          fontSize: 30,
        });
        previews.push(preview.imageUrl);
      } catch (error) {
        previews.push(`https://via.placeholder.com/640x360/1a1a2e/ffffff?text=Scene+${i + 1}`);
      }
    }

    return previews;
  }

  private getDimensions(aspectRatio?: string, width?: number, height?: number): { width: number; height: number } {
    if (width && height) return { width, height };

    switch (aspectRatio) {
      case "9:16":
        return { width: 1080, height: 1920 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "4:5":
        return { width: 1080, height: 1350 };
      case "16:9":
      default:
        return { width: 1920, height: 1080 };
    }
  }
}
