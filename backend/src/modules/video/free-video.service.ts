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

    try {
      const thumbnailUrl = await this.generateFreeImage(prompt);
      
      return {
        success: true,
        thumbnailUrl,
        videoUrl: thumbnailUrl,
        engine: "free-slideshow",
        duration: 5,
      };
    } catch (err) {
      this.logger.error(`Free video generation failed: ${err.message}`);
      return { success: false, engine: "free-fallback" } as VideoGenerationResult;
    }
  }

  private async generateFreeImage(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 300));
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${Date.now()}&nologo=true`;
  }
}
