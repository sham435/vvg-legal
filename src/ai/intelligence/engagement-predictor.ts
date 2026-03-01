import { Injectable, Logger } from "@nestjs/common";
import { IntelligentRouter } from "../orchestrator/intelligent-router";
import { CostOptimizer } from "../orchestrator/cost-optimizer";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";

export interface ViralScore {
  totalScore: number; // 0-100
  metrics: {
    hookStrength: number; // 0-10
    pacingScore: number; // 0-10
    emotionalImpact: number; // 0-10
    trendAlignment: number; // 0-10
  };
  suggestions: string[];
}

@Injectable()
export class EngagementPredictor {
  private readonly logger = new Logger(EngagementPredictor.name);
  private openai: OpenAI;

  constructor(
    private readonly router: IntelligentRouter,
    private readonly costOptimizer: CostOptimizer,
    private readonly config: ConfigService,
  ) {
    const openrouterKey = this.config.get<string>("OPENROUTER_API_KEY");
    const openaiKey = this.config.get<string>("OPENAI_API_KEY");
    const apiKey = openrouterKey || openaiKey;
    const isOpenRouter = !!openrouterKey;

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: isOpenRouter
          ? "https://openrouter.ai/api/v1"
          : "https://api.openai.com/v1",
        defaultHeaders: isOpenRouter
          ? {
              "HTTP-Referer": "https://vvg.local",
              "X-Title": "Viral Video Generator",
            }
          : undefined,
      });
    }
  }

  /**
   * Predict viral potential of a script
   */
  async predictViralScore(
    scriptContent: string,
    topic: string,
  ): Promise<ViralScore> {
    if (!this.openai) {
      this.logger.warn(
        "OpenAI/OpenRouter not configured, returning mock score",
      );
      return this.getMockScore();
    }

    const prompt = `Analyze this video script for viral potential on TikTok/YouTube Shorts.
Topic: ${topic}

Script:
"${scriptContent}"

Evaluate on 4 criteria (0-10 scale):
1. Hook Strength (Is the first 3 seconds grabbing?)
2. Pacing (Is it fast, dynamic, no fluff?)
3. Emotional Impact (Does it provoke curiosity, joy, or shock?)
4. Trend Alignment (Does it feel current?)

Return JSON:
{
  "metrics": {
    "hookStrength": 8,
    "pacingScore": 7,
    "emotionalImpact": 6,
    "trendAlignment": 5
  },
  "suggestions": ["Make the hook more shocking", "Cut the middle section"]
}`;

    const fallbackModels = [
      "google/gemma-3-12b-it:free",
      "google/gemma-3-4b-it:free",
      "mistralai/mistral-7b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ];

    for (let attempt = 0; attempt < fallbackModels.length; attempt++) {
      try {
        const model = fallbackModels[attempt];
        
        const completion = await this.openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const response = JSON.parse(
          completion.choices[0].message.content || "{}",
        );
        const metrics = response.metrics || {
          hookStrength: 5,
          pacingScore: 5,
          emotionalImpact: 5,
          trendAlignment: 5,
        };

        const totalScore =
          metrics.hookStrength * 3.0 +
          metrics.pacingScore * 2.5 +
          metrics.emotionalImpact * 2.5 +
          metrics.trendAlignment * 2.0;

        return {
          totalScore: Math.min(100, Math.round(totalScore)),
          metrics: {
            hookStrength: metrics.hookStrength,
            pacingScore: metrics.pacingScore,
            emotionalImpact: metrics.emotionalImpact,
            trendAlignment: metrics.trendAlignment,
          },
          suggestions: response.suggestions || [],
        };
      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.message?.includes("rate limit");
        this.logger.warn(
          `Model attempt ${attempt + 1} failed${isRateLimit ? " (rate limited)" : ""}: ${error.message}`,
        );
        
        if (!isRateLimit && attempt === fallbackModels.length - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    this.logger.error("All models failed, returning mock score");
    return this.getMockScore();
  }

  private getMockScore(): ViralScore {
    return {
      totalScore: 75,
      metrics: {
        hookStrength: 7,
        pacingScore: 8,
        emotionalImpact: 7,
        trendAlignment: 8,
      },
      suggestions: ["Default mock suggestion: Improve hook"],
    };
  }
}
