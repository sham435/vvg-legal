import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";

@Injectable()
export class VyroService {
  private readonly logger = new Logger(VyroService.name);

  constructor(private readonly config: ConfigService) {}

  private getAuthHeader(): { Authorization: string } | null {
    const token = this.config.get<string>("VYRO_API_KEY") || 
                  this.config.get<string>("IMAGINE_TOKEN");
    if (!token) {
      return null;
    }
    return {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };
  }

  private async generateWithPollinations(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
    
    const response = await axios.get(url, { responseType: 'text' });
    
    if (response.status === 200 && response.data) {
      return response.data;
    }
    
    throw new Error("Pollinations generation failed");
  }

  /**
   * Generate an image using Vyro API with Pollinations fallback.
   * Returns the image URL.
   */
  async generateImage(
    prompt: string,
    style: string = "realistic",
    aspectRatio: string = "1:1",
    seed?: string,
  ): Promise<any> {
    const authHeader = this.getAuthHeader();
    
    if (!authHeader) {
      this.logger.warn("VYRO_API_KEY not configured, using Pollinations fallback");
      const pollinationsUrl = await this.generateWithPollinations(prompt);
      return { imageUrl: pollinationsUrl, source: "pollinations" };
    }

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);
    form.append("aspect_ratio", aspectRatio);
    if (seed) form.append("seed", seed);

    const headers = { ...form.getHeaders(), ...authHeader };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/image/generations",
        form,
        { headers },
      );
      return { ...response.data, source: "vyro" };
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.warn("Vyro authentication failed (401), using Pollinations fallback");
        const pollinationsUrl = await this.generateWithPollinations(prompt);
        return { imageUrl: pollinationsUrl, source: "pollinations" };
      }
      
      this.logger.error("Vyro image generation failed, trying Pollinations", error);
      try {
        const pollinationsUrl = await this.generateWithPollinations(prompt);
        return { imageUrl: pollinationsUrl, source: "pollinations" };
      } catch (fallbackError) {
        this.logger.error("Pollinations fallback also failed", fallbackError);
        throw error;
      }
    }
  }

  /**
   * Generate a video from text using Vyro API.
   */
  async generateTextToVideo(
    prompt: string,
    style: string = "kling-1.0-pro",
  ): Promise<any> {
    const authHeader = this.getAuthHeader();
    
    if (!authHeader) {
      throw new Error("VYRO_API_KEY not configured for text-to-video");
    }

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);

    const headers = { ...form.getHeaders(), ...authHeader };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/video/text-to-video",
        form,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error("Vyro authentication failed (401)", error);
      } else {
        this.logger.error("Vyro text-to-video generation failed", error);
      }
      throw error;
    }
  }

  /**
   * Generate a video from an image using Vyro API.
   * `imagePath` should be a local file path to the image.
   */
  async generateImageToVideo(
    prompt: string,
    style: string = "kling-1.0-pro",
    imagePath: string,
  ): Promise<any> {
    const authHeader = this.getAuthHeader();
    
    if (!authHeader) {
      throw new Error("VYRO_API_KEY not configured for image-to-video");
    }

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);
    form.append("file", fs.createReadStream(imagePath));

    const headers = { ...form.getHeaders(), ...authHeader };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/video/image-to-video",
        form,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error("Vyro authentication failed (401)", error);
      } else {
        this.logger.error("Vyro image-to-video generation failed", error);
      }
      throw error;
    }
  }
}
