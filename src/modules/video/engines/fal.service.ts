import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class FalService {
  private readonly logger = new Logger(FalService.name);
  private readonly apiKey: string;
  private readonly apiUrl = "https://queue.fal.run/fal-ai/fast-svd";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("FAL_KEY");
    if (!this.apiKey) {
      this.logger.warn("FAL_KEY not configured - Fal.ai will not work");
    } else {
      this.logger.log("Fal.ai service initialized");
    }
  }

  async generateVideo(prompt: string, options: any = {}): Promise<any> {
    this.logger.log(`Generating video with Fal.ai: ${prompt.substring(0, 50)}...`);

    try {
      const payload = {
        prompt: prompt.substring(0, 500),
        negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy",
        num_frames: 25,
        fps: 6,
        motion_bucket_id: 127,
      };

      const response = await axios.post(
        this.apiUrl,
        payload,
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
        }
      );

      this.logger.log(`Fal.ai response: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.video) {
        return {
          success: true,
          videoUrl: response.data.video.url,
          thumbnailUrl: response.data.video.url,
          engine: "fal-ai",
          duration: 5,
        };
      }

      if (response.data && response.data.images) {
        return {
          success: true,
          videoUrl: response.data.images[0]?.url,
          thumbnailUrl: response.data.images[0]?.url,
          engine: "fal-ai",
          duration: 5,
        };
      }

      throw new Error("No video or image returned from Fal.ai");
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Fal.ai generation failed: ${errorMsg}`);
      throw new Error(`Fal.ai generation failed: ${errorMsg}`);
    }
  }
}
