import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);
  private readonly apiKey: string;
  private readonly apiUrl = "https://router.huggingface.co/huggingface";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("HF_TOKEN");
    if (!this.apiKey) {
      this.logger.warn("HF_TOKEN not configured - Hugging Face will not work");
    } else {
      this.logger.log("Hugging Face service initialized");
    }
  }

  async generateVideo(prompt: string, options: any = {}): Promise<any> {
    this.logger.log(`Generating video with Hugging Face: ${prompt.substring(0, 50)}...`);

    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion",
        {
          inputs: prompt.substring(0, 500),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 300000,
        }
      );

      if (response.data) {
        const base64 = Buffer.from(response.data).toString("base64");
        const videoUrl = `data:video/mp4;base64,${base64}`;

        return {
          success: true,
          videoUrl: videoUrl,
          thumbnailUrl: videoUrl,
          engine: "huggingface-svd",
          duration: 5,
        };
      }

      throw new Error("No video returned from Hugging Face");
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Hugging Face generation failed: ${errorMsg}`);
      throw new Error(`Hugging Face generation failed: ${errorMsg}`);
    }
  }

  async analyzeImage(imageUrl: string): Promise<any> {
    this.logger.log(`Analyzing image with Hugging Face: ${imageUrl}`);

    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct",
        {
          inputs: {
            image: imageUrl,
            text: "Describe this image in one sentence for viral video content.",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      return {
        success: true,
        analysis: response.data,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Hugging Face image analysis failed: ${errorMsg}`);
      throw new Error(`Hugging Face analysis failed: ${errorMsg}`);
    }
  }
}
