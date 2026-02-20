import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosResponse } from "axios";

export interface ThumbnailOptions {
  aspectRatio?: string;
  stylize?: number;
  quality?: number;
  forceOfficial?: boolean;
}

/**
 * Thumbnail generation service
 * Communicates with NestJS Midjourney API (which handles routing)
 * This service treats the Midjourney API as a black box -
 * it doesn't know if requests go to official API or Discord bot
 */
@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly midjourneyApiUrl: string;
  private readonly midjourneyApiKey: string;
  private readonly timeout: number = 90000; // 90 seconds for image generation

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.midjourneyApiUrl = this.configService.get<string>(
      "MIDJOURNEY_API_URL",
      "http://midjourney-api-public:4000",
    );
    this.midjourneyApiKey = this.configService.get<string>(
      "MIDJOURNEY_API_KEY",
      "",
    );

    if (!this.midjourneyApiKey) {
      this.logger.warn(
        "⚠️ Midjourney API KEY is not configured (MIDJOURNEY_API_KEY). Thumbnail generation will fail. " +
          "Please provide a valid key in your environment settings.",
      );
    }

    if (this.midjourneyApiUrl === "http://midjourney-api-public:4000") {
      this.logger.log("ℹ️ Using default Midjourney API URL (public instance).");
    }
  }

  /**
   * Generate a thumbnail for viral video
   * @param prompt - Text prompt for thumbnail
   * @param options - Generation options
   * @returns Thumbnail URL and metadata
   */
  async generateThumbnail(prompt: string, options: ThumbnailOptions = {}) {
    const startTime = Date.now();

    this.logger.log(
      `Generating thumbnail: "${prompt.substring(0, 50)}..." ` +
        `(aspect: ${options.aspectRatio || "16:9"}, force official: ${options.forceOfficial || false})`,
    );

    try {
      const payload = {
        prompt,
        aspectRatio: options.aspectRatio || "16:9", // Default to YouTube aspect ratio
        stylize: options.stylize,
        quality: options.quality,
        isPublicRequest: options.forceOfficial || false, // Internal request unless forced
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.midjourneyApiUrl}/generate`, payload, {
          headers: {
            Authorization: `Bearer ${this.midjourneyApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.timeout,
        }),
      );

      const generationTime = Date.now() - startTime;

      this.logger.log(
        `Thumbnail generated successfully in ${generationTime}ms ` +
          `via ${response.data.metadata?.provider || "unknown"} provider`,
      );

      return {
        jobId: response.data.jobId,
        status: response.data.status,
        message: response.data.message,
        imageUrl: response.data.imageUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        progress: response.data.progress,
        generationTime,
        provider: response.data.metadata?.provider,
      };
    } catch (error) {
      this.logger.error(
        `Thumbnail generation failed: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          code: "THUMBNAIL_GENERATION_FAILED",
          message: `Failed to generate thumbnail: ${error.response?.data?.message || error.message}`,
          details: error.response?.data,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check the status of a thumbnail generation job
   * @param jobId - The job ID to check
   * @returns Job status and result
   */
  async getThumbnailStatus(jobId: string) {
    this.logger.log(`Checking thumbnail job status: ${jobId}`);

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.midjourneyApiUrl}/status/${jobId}`, {
          headers: {
            Authorization: `Bearer ${this.midjourneyApiKey}`,
          },
          timeout: 10000,
        }),
      );

      return {
        jobId: response.data.jobId,
        status: response.data.status,
        message: response.data.message,
        imageUrl: response.data.imageUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        progress: response.data.progress,
        provider: response.data.metadata?.provider,
      };
    } catch (error) {
      this.logger.error(`Failed to get thumbnail status: ${error.message}`);

      throw new HttpException(
        {
          code: "STATUS_CHECK_FAILED",
          message: "Failed to retrieve thumbnail job status",
          details: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
