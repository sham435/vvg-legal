import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class NemotronNanoService {
  private readonly logger = new Logger(NemotronNanoService.name);
  private readonly openai: any;

  constructor(private readonly config: ConfigService) {
    const openrouterKey = this.config.get<string>("OPENROUTER_API_KEY");
    if (openrouterKey) {
      const OpenAI = require("openai");
      this.openai = new OpenAI({
        apiKey: openrouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://vvg-production.up.railway.app",
          "X-Title": "Viral Video Generator",
        },
      });
    }
  }

  async generateScript(topic: string, context?: string): Promise<any> {
    if (!this.openai) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const prompt = this.buildScriptPrompt(topic, context);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages: [
          {
            role: "system",
            content: "You are an expert viral video script writer. Create engaging, high-retention scripts optimized for short-form video platforms.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return this.parseScriptResponse(completion.choices[0].message.content);
    } catch (error) {
      this.logger.error(`Nemotron script generation failed: ${error.message}`);
      throw error;
    }
  }

  async extractTextFromImage(imageUrl: string): Promise<string> {
    if (!this.openai) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text visible in this image. Return only the extracted text, no explanations.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OCR extraction failed: ${error.message}`);
      return "";
    }
  }

  async analyzeVideoFrames(frames: string[]): Promise<string> {
    if (!this.openai) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      const messages: any[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these video frames and describe: 1) What is happening, 2) Key visual elements, 3) Potential viral moments",
            },
            ...frames.map((frame) => ({
              type: "image_url",
              image_url: { url: frame },
            })),
          ],
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages,
        max_tokens: 2000,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Video analysis failed: ${error.message}`);
      return "";
    }
  }

  private buildScriptPrompt(topic: string, context?: string): string {
    return `
Create a viral video script about: "${topic}"

${context ? `Additional context: ${context}` : ""}

Requirements:
- Hook in first 3 seconds
- 60-90 second duration
- 5-7 quick scenes
- Emotional arc
- Clear call to action
- Trending hashtags

Format as JSON with:
- title
- hook
- scenes (array with sceneNumber, duration, description, visualPrompt, narration)
- hashtags
`;
  }

  private parseScriptResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw: content };
    } catch (error) {
      this.logger.error("Failed to parse script response");
      return null;
    }
  }
}
