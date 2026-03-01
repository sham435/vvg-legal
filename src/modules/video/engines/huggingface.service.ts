import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);
  private readonly apiKey: string;

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
        "https://api-inference.huggingface.co/models/ByteDance/AnimateDiff",
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
          engine: "huggingface-animatediff",
          duration: 5,
        };
      }

      throw new Error("No video returned from Hugging Face");
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Hugging Face video generation failed: ${errorMsg}`);
      throw new Error(`Hugging Face video generation failed: ${errorMsg}`);
    }
  }

  async analyzeTrendingContent(imageUrl: string): Promise<any> {
    this.logger.log(`Analyzing trending content: ${imageUrl}`);

    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct",
        {
          inputs: {
            image: imageUrl,
            text: "Analyze this image for viral potential. Return JSON with: viral_elements, video_concepts (3 ideas), target_audience, trending_hashtags (10), emotional_appeal",
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
      return { success: false, error: errorMsg };
    }
  }

  async generateViralScript(topic: string, style: string = "trending"): Promise<any> {
    this.logger.log(`Generating viral script for: ${topic}`);

    try {
      const prompt = `Create a 30-second viral video script about "${topic}" in ${style} style. Return JSON with: hook (first 3 seconds), pattern_interrupt (seconds 4-10), main_content (seconds 11-25), cta (seconds 26-30), audio_suggestion, visual_directions`;

      const response = await axios.post(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        {
          inputs: prompt,
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
        script: response.data,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Script generation failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async generateSocialPackage(videoDescription: string): Promise<any> {
    this.logger.log(`Generating social package for: ${videoDescription.substring(0, 50)}...`);

    try {
      const prompt = `Create viral social media content. Return JSON with: captions (short/storytelling/question), hashtags (trending/niche/branded arrays), posting_strategy (best_time/platforms/hook_text), engagement_hooks (array)`;

      const response = await axios.post(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        {
          inputs: `${prompt}\n\nVideo: ${videoDescription}`,
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
        socialPackage: response.data,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      this.logger.error(`Social package generation failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
