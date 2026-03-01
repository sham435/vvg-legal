import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class Json2VideoService {
  private readonly logger = new Logger(Json2VideoService.name);
  private readonly apiKey: string;
  private readonly apiUrl = "https://api.json2video.com/v2/movies";
  private readonly webhookBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("JSON2VIDEO_API_KEY");
    this.webhookBaseUrl = this.config.get<string>("WEBHOOK_BASE_URL", "https://vvg-production.up.railway.app");

    if (!this.apiKey) {
      this.logger.warn("⚠️ JSON2VIDEO_API_KEY not configured. JSON2Video unavailable.");
    } else {
      this.logger.log("✅ JSON2Video service initialized");
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateThumbnail(title: string, options: any = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error("JSON2VIDEO_API_KEY not configured");
    }

    const projectId = uuidv4();

    const project = {
      project: projectId,
      callback: `${this.webhookBaseUrl}/api/v1/video/webhook/json2video`,
      width: options.width || 1280,
      height: options.height || 720,
      quality: options.quality || "high",
      scenes: [
        {
          duration: 1,
          background: {
            color: options.backgroundColor || "#1a1a2e",
          },
          elements: [
            {
              type: "text",
              text: title,
              font: options.font || "Poppins",
              fontSize: options.fontSize || 60,
              color: options.textColor || "#ffffff",
              position: options.textPosition || "center",
              style: {
                bold: true,
                shadow: true,
                stroke: options.strokeColor || "#000000",
                strokeWidth: 2,
              },
            },
            {
              type: "image",
              src: options.backgroundImage || "https://images.unsplash.com/photo-1557683316-973673baf926",
              opacity: 0.6,
              position: "cover",
            },
          ],
        },
      ],
    };

    return this.renderVideo(project);
  }

  async generateVideoFromScript(script: any): Promise<string> {
    const scenes: any[] = [];

    scenes.push({
      duration: 3,
      background: { color: "#0a0a0a" },
      elements: [
        {
          type: "text",
          text: script.hook || "You won't believe this!",
          font: "Montserrat",
          fontSize: 70,
          color: "#ffffff",
          position: "center",
          animation: "fade-in",
        },
      ],
    });

    for (const scene of script.scenes || []) {
      scenes.push({
        duration: scene.duration || 5,
        background: { color: "#1a1a2e" },
        elements: [
          {
            type: "text",
            text: scene.narration || "",
            font: "Open Sans",
            fontSize: 40,
            color: "#ffffff",
            position: "bottom",
            animation: "slide-up",
          },
          {
            type: "image",
            src: scene.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
            position: "cover",
            opacity: 0.8,
          },
        ],
      });
    }

    scenes.push({
      duration: 3,
      background: { color: "#0a0a0a" },
      elements: [
        {
          type: "text",
          text: "Subscribe for more!",
          font: "Poppins",
          fontSize: 50,
          color: "#ff3366",
          position: "center",
          animation: "pulse",
        },
      ],
    });

    const project = {
      project: uuidv4(),
      callback: `${this.webhookBaseUrl}/api/v1/video/webhook/json2video`,
      width: 1080,
      height: 1920,
      quality: "high",
      scenes,
    };

    return this.renderVideo(project);
  }

  async generateShortsVideo(title: string, scenes: any[]): Promise<string> {
    const project = {
      project: uuidv4(),
      callback: `${this.webhookBaseUrl}/api/v1/video/webhook/json2video`,
      width: 1080,
      height: 1920,
      quality: "high",
      scenes: scenes.map((scene: any, index: number) => ({
        duration: scene.duration || 5,
        background: { color: scene.backgroundColor || "#1a1a2e" },
        elements: [
          {
            type: "text",
            text: scene.text || "",
            font: "Poppins",
            fontSize: index === 0 ? 80 : 50,
            color: "#ffffff",
            position: index === 0 ? "center" : "bottom",
            animation: index === 0 ? "zoom-in" : "slide-up",
          },
        ],
      })),
    };

    return this.renderVideo(project);
  }

  private async renderVideo(project: any): Promise<string> {
    try {
      this.logger.log(`🎬 Submitting video rendering job: ${project.project}`);

      const response = await axios.post(this.apiUrl, project, {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        this.logger.log(`✅ Video rendering job submitted: ${response.data.movieId}`);
        return response.data.movieId || response.data.url;
      }

      throw new Error("Invalid response from JSON2Video");
    } catch (error: any) {
      this.logger.error(`❌ JSON2Video rendering failed: ${error.message}`);
      throw error;
    }
  }

  async checkStatus(movieId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/${movieId}`, {
        headers: { "x-api-key": this.apiKey },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to check status: ${error.message}`);
      return null;
    }
  }

  async handleWebhook(data: any): Promise<void> {
    this.logger.log(`📥 Received webhook from JSON2Video: ${JSON.stringify(data)}`);

    if (data.status === "completed") {
      this.logger.log(`✅ Video rendering completed: ${data.output}`);
    } else if (data.status === "failed") {
      this.logger.error(`❌ Video rendering failed: ${data.error}`);
    }
  }
}
