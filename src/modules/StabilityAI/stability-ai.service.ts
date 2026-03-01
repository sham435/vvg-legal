import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { v4 as uuidv4 } from "uuid";

export interface StabilityImageOptions {
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  seed?: number;
  steps?: number;
  guidance?: number;
  promptStrength?: number;
}

export interface StabilityVideoOptions {
  seed?: number;
  steps?: number;
  motionBucketId?: number;
}

export interface StabilityGenerationResult {
  imageUrl?: string;
  videoUrl?: string;
  localPath?: string;
  seed?: number;
  generationTime: number;
  provider: string;
}

@Injectable()
export class StabilityAiService {
  private readonly logger = new Logger(StabilityAiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number = 120000;
  private readonly baseUrl = "https://api.stability.ai/v2beta";

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>("STABILITY_API_KEY", "");
    this.model = this.configService.get<string>("STABILITY_MODEL", "stable-diffusion-3.5-large");

    if (!this.apiKey) {
      this.logger.warn(
        "⚠️ Stability AI API KEY is not configured (STABILITY_API_KEY). Image generation will fail.",
      );
    } else {
      this.logger.log(`ℹ️ Using Stability AI model: ${this.model}`);
    }
  }

  private getAspectRatioDimensions(aspectRatio: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      "16:9": { width: 1024, height: 576 },
      "9:16": { width: 576, height: 1024 },
      "1:1": { width: 1024, height: 1024 },
      "4:3": { width: 1024, height: 768 },
      "3:4": { width: 768, height: 1024 },
    };
    return dimensions[aspectRatio] || dimensions["16:9"];
  }

  async generateImage(
    prompt: string,
    options: StabilityImageOptions = {},
  ): Promise<StabilityGenerationResult> {
    const startTime = Date.now();

    this.logger.log(
      `Generating image with Stability AI: "${prompt.substring(0, 50)}..." (model: ${this.model})`,
    );

    if (!this.apiKey) {
      throw new HttpException(
        { code: "STABILITY_API_KEY_MISSING", message: "Stability AI API key is not configured" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const { width, height } = this.getAspectRatioDimensions(options.aspectRatio || "16:9");

      const requestBody: any = {
        prompt,
        cfg_scale: options.guidance || 7,
        steps: options.steps || 30,
        width,
        height,
      };

      if (options.seed) {
        requestBody.seed = options.seed;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/image-generation/${this.model}/text-to-image`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: this.timeout,
          },
        ),
      );

      const base64Image = response.data.artifacts[0].base64;
      const imageBuffer = Buffer.from(base64Image, "base64");

      const uploadDir = path.join(process.cwd(), "uploads", "images");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `stability_${uuidv4()}.png`;
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, imageBuffer);

      const imageUrl = `/uploads/images/${filename}`;

      const generationTime = Date.now() - startTime;
      this.logger.log(`Image generated successfully in ${generationTime}ms`);

      return {
        imageUrl,
        localPath,
        seed: response.data.artifacts[0].seed,
        generationTime,
        provider: "stability-ai",
      };
    } catch (error: any) {
      this.logger.error(`Stability AI image generation failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          code: "IMAGE_GENERATION_FAILED",
          message: `Failed to generate image: ${error.response?.data?.message || error.message}`,
          details: error.response?.data,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateImageAndConvertToVideo(
    prompt: string,
    imageOptions: StabilityImageOptions = {},
    videoOptions: StabilityVideoOptions = {},
  ): Promise<StabilityGenerationResult> {
    const startTime = Date.now();

    this.logger.log(
      `Generating image-to-video with Stability AI: "${prompt.substring(0, 50)}..."`,
    );

    const imageResult = await this.generateImage(prompt, imageOptions);

    try {
      const requestBody: any = {
        image: imageResult.localPath
          ? fs.readFileSync(imageResult.localPath).toString("base64")
          : null,
        seed: videoOptions.seed || 0,
        steps: videoOptions.steps || 30,
      };

      if (videoOptions.motionBucketId) {
        requestBody.motion_bucket_id = videoOptions.motionBucketId;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/image-to-video/${this.model}`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: this.timeout,
          },
        ),
      );

      const base64Video = response.data.artifacts[0].base64;
      const videoBuffer = Buffer.from(base64Video, "base64");

      const uploadDir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `stability_video_${uuidv4()}.mp4`;
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, videoBuffer);

      const videoUrl = `/uploads/videos/${filename}`;

      const generationTime = Date.now() - startTime;
      this.logger.log(`Video generated successfully in ${generationTime}ms`);

      return {
        imageUrl: imageResult.imageUrl,
        videoUrl,
        localPath,
        seed: response.data.artifacts[0].seed,
        generationTime,
        provider: "stability-ai",
      };
    } catch (error: any) {
      this.logger.error(
        `Stability AI image-to-video conversion failed: ${error.message}`,
        error.stack,
      );

      return {
        imageUrl: imageResult.imageUrl,
        localPath: imageResult.localPath,
        generationTime: Date.now() - startTime,
        provider: "stability-ai",
      };
    }
  }

  async generateVideo(
    prompt: string,
    options: StabilityVideoOptions = {},
  ): Promise<StabilityGenerationResult> {
    const startTime = Date.now();

    this.logger.log(
      `Generating video with Stability AI: "${prompt.substring(0, 50)}..."`,
    );

    if (!this.apiKey) {
      throw new HttpException(
        { code: "STABILITY_API_KEY_MISSING", message: "Stability AI API key is not configured" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const requestBody: any = {
        prompt,
        seed: options.seed || Math.floor(Math.random() * 1000000),
        steps: options.steps || 30,
      };

      if (options.motionBucketId) {
        requestBody.motion_bucket_id = options.motionBucketId;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/video-generation/${this.model}/text-to-video`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: this.timeout,
          },
        ),
      );

      const base64Video = response.data.artifacts[0].base64;
      const videoBuffer = Buffer.from(base64Video, "base64");

      const uploadDir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `stability_video_${uuidv4()}.mp4`;
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, videoBuffer);

      const videoUrl = `/uploads/videos/${filename}`;

      const generationTime = Date.now() - startTime;
      this.logger.log(`Video generated successfully in ${generationTime}ms`);

      return {
        videoUrl,
        localPath,
        seed: response.data.artifacts[0].seed,
        generationTime,
        provider: "stability-ai",
      };
    } catch (error: any) {
      this.logger.error(`Stability AI video generation failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          code: "VIDEO_GENERATION_FAILED",
          message: `Failed to generate video: ${error.response?.data?.message || error.message}`,
          details: error.response?.data,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
