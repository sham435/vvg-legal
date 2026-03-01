import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class FalService {
  private readonly logger = new Logger(FalService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("FAL_AI_API_KEY");
    if (!this.apiKey) {
      this.logger.warn("FAL_AI_API_KEY not configured - Fal.ai will not work");
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
        num_frames: 16,
        fps: 8,
      };

      const response = await axios.post(
        "https://queue.fal.run/fal-ai/animatediff",
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

      const requestId = response.data.request_id;
      
      if (!requestId) {
        throw new Error("No request ID returned from Fal.ai");
      }

      this.logger.log(`Fal.ai request ID: ${requestId}, polling for result...`);

      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(
          `https://queue.fal.run/fal-ai/animatediff/requests/${requestId}`,
          {
            headers: { Authorization: `Key ${this.apiKey}` },
          }
        );

        this.logger.log(`Fal.ai status: ${statusResponse.data.status}`);

        if (statusResponse.data.status === "COMPLETED") {
          return {
            success: true,
            videoUrl: statusResponse.data.output?.video?.url,
            thumbnailUrl: statusResponse.data.output?.images?.[0]?.url,
            engine: "fal-ai",
            duration: 5,
          };
        }

        if (statusResponse.data.status === "FAILED") {
          throw new Error("Fal.ai generation failed");
        }
      }

      throw new Error("Fal.ai polling timeout");
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Fal.ai generation failed: ${errorMsg}`);
      throw new Error(`Fal.ai generation failed: ${errorMsg}`);
    }
  }
}
