import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";

@Injectable()
export class VyroService {
  private readonly logger = new Logger(VyroService.name);

  constructor(private readonly config: ConfigService) {}

  private getAuthHeader(): { Authorization: string } {
    const token = this.config.get<string>("IMAGINE_TOKEN");
    if (!token) {
      throw new Error("IMAGINE_TOKEN not configured");
    }
    // Ensure token includes Bearer prefix
    return {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };
  }

  /**
   * Generate an image using Vyro API.
   * Returns the API response data.
   */
  async generateImage(
    prompt: string,
    style: string = "realistic",
    aspectRatio: string = "1:1",
    seed?: string,
  ): Promise<any> {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);
    form.append("aspect_ratio", aspectRatio);
    if (seed) form.append("seed", seed);

    const headers = { ...form.getHeaders(), ...this.getAuthHeader() };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/image/generations",
        form,
        { headers },
      );
      return response.data;
    } catch (error) {
      this.logger.error("Vyro image generation failed", error);
      throw error;
    }
  }

  /**
   * Generate a video from text using Vyro API.
   */
  async generateTextToVideo(
    prompt: string,
    style: string = "kling-1.0-pro",
  ): Promise<any> {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);

    const headers = { ...form.getHeaders(), ...this.getAuthHeader() };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/video/text-to-video",
        form,
        { headers },
      );
      return response.data;
    } catch (error) {
      this.logger.error("Vyro text-to-video generation failed", error);
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
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", style);
    form.append("file", fs.createReadStream(imagePath));

    const headers = { ...form.getHeaders(), ...this.getAuthHeader() };
    try {
      const response = await axios.post(
        "https://api.vyro.ai/v2/video/image-to-video",
        form,
        { headers },
      );
      return response.data;
    } catch (error) {
      this.logger.error("Vyro image-to-video generation failed", error);
      throw error;
    }
  }
}
