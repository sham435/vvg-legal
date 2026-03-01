import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common";
import { StabilityAiService, StabilityImageOptions, StabilityVideoOptions } from "./stability-ai.service";

class GenerateImageDto {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  seed?: number;
  steps?: number;
  guidance?: number;
}

class GenerateVideoDto {
  prompt: string;
  seed?: number;
  steps?: number;
  motionBucketId?: number;
}

class ImageToVideoDto {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  seed?: number;
  steps?: number;
  motionBucketId?: number;
}

@Controller("stability-ai")
export class StabilityAiController {
  constructor(private readonly stabilityAiService: StabilityAiService) {}

  @Post("generate-image")
  async generateImage(@Body() dto: GenerateImageDto) {
    const options: StabilityImageOptions = {
      aspectRatio: dto.aspectRatio,
      seed: dto.seed,
      steps: dto.steps,
      guidance: dto.guidance,
    };

    return this.stabilityAiService.generateImage(dto.prompt, options);
  }

  @Post("generate-video")
  async generateVideo(@Body() dto: GenerateVideoDto) {
    const options: StabilityVideoOptions = {
      seed: dto.seed,
      steps: dto.steps,
      motionBucketId: dto.motionBucketId,
    };

    return this.stabilityAiService.generateVideo(dto.prompt, options);
  }

  @Post("image-to-video")
  async imageToVideo(@Body() dto: ImageToVideoDto) {
    const imageOptions: StabilityImageOptions = {
      aspectRatio: dto.aspectRatio,
    };

    const videoOptions: StabilityVideoOptions = {
      seed: dto.seed,
      steps: dto.steps,
      motionBucketId: dto.motionBucketId,
    };

    return this.stabilityAiService.generateImageAndConvertToVideo(
      dto.prompt,
      imageOptions,
      videoOptions,
    );
  }

  @Get("health")
  async health() {
    return {
      status: "ok",
      provider: "stability-ai",
      model: "stable-diffusion-3.5-large",
    };
  }
}
