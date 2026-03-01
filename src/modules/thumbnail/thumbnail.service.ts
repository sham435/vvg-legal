import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
  private readonly json2VideoApiKey: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.json2VideoApiKey = this.config.get<string>("JSON2VIDEO_API_KEY");
    if (!this.json2VideoApiKey) {
      this.logger.warn(
        "⚠️ JSON2VIDEO_API_KEY not configured. Using fallback placeholder images.",
      );
    } else {
      this.logger.log("✅ ThumbnailService initialized with JSON2Video");
    }
  }

  isConfigured(): boolean {
    return !!this.json2VideoApiKey;
  }

  async generateThumbnail(prompt: string, options: ThumbnailOptions = {}) {
    const startTime = Date.now();

    this.logger.log(`Generating thumbnail: "${prompt.substring(0, 50)}..."`);

    try {
      if (!this.isConfigured()) {
        throw new Error("JSON2VIDEO_API_KEY not configured");
      }

      const axios = require("axios");
      const { width, height } = this.getDimensions(options.aspectRatio, options.width, options.height);
      
      const response = await axios.post(
        "https://api.json2video.com/v2/movies",
        {
          prompt,
          width,
          height,
          callback: `${this.config.get<string>("WEBHOOK_BASE_URL")}/api/v1/video/webhook/json2video`,
        },
        { headers: { "x-api-key": this.json2VideoApiKey } }
      );
      
      const movieId = response.data?.movie_id;
      if (!movieId) throw new Error("No movie ID returned");

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

    return {
      jobId,
      status: "unknown",
      message: "JSON2Video not configured, using placeholder",
    };
  }

  async generateChannelArt(title: string, channelName: string): Promise<string> {
    return `https://via.placeholder.com/2560x1440/1a1a2e/ffffff?text=${encodeURIComponent(channelName)}`;
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
