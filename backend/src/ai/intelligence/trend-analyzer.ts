import { Injectable, Logger } from "@nestjs/common";
import { IntelligentRouter } from "../orchestrator/intelligent-router";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TrendAnalyzer {
  private readonly logger = new Logger(TrendAnalyzer.name);
  private openai: OpenAI;

  constructor(
    private readonly router: IntelligentRouter,
    private readonly config: ConfigService,
  ) {
    const openrouterKey = this.config.get<string>("OPENROUTER_API_KEY");
    // Reuse existing config logic
    if (openrouterKey) {
      this.openai = new OpenAI({
        apiKey: openrouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://vvg.local",
          "X-Title": "Viral Video Generator",
        },
      });
    }
  }

  /**
   * Suggest trending pivots for a given topic
   */
  async suggestPivots(originalTopic: string): Promise<string[]> {
    if (!this.openai) return [originalTopic];

    const prompt = `The user wants to make a video about "${originalTopic}".
Suggest 3 "Trending Pivots" that make this topic more viral for YouTube Shorts right now.
Consider: "versus" battles, "exposed" angles, or "life hack" framing.

Return JSON:
{
  "pivots": ["Pivot 1", "Pivot 2", "Pivot 3"]
}`;

    try {
      const provider = this.router.selectProvider({
        prompt,
        contentType: "script",
        constraints: { minQuality: "high" }, // Need creative model like Gemma 3
      });

      const completion = await this.openai.chat.completions.create({
        model: provider.name,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(
        completion.choices[0].message.content || "{}",
      );
      return response.pivots || [originalTopic];
    } catch (error) {
      this.logger.warn("Failed to get trend pivots", error);
      return [originalTopic];
    }
  }

  /**
   * Analyze the current web/cultural zeitgeist to find top viral opportunities.
   * Uses "Deep Research" models if available, or Creative/Reasoning models.
   */
  async analyzeCurrentTrends(): Promise<{ topic: string; score: number }[]> {
    if (!this.openai) {
      // Fallback if no API key
      return [
        { topic: "Hidden iPhone Features Nobody Knows", score: 85 },
        { topic: "Psychology Tricks to Control People", score: 90 },
        { topic: "Space Facts That Will Scare You", score: 88 },
      ];
    }

    const prompt = `Identify 5 currently viral or rising topics suitable for YouTube Shorts and TikTok.
Focus on: Tech Myths, Psychology Facts, History Secrets, or "Unsettling" trivia.
Estimate a "Viral Potential Score" (0-100) for each.

Return strictly JSON:
{
  "trends": [
    { "topic": "Title of topic", "score": 85 },
    ...
  ]
}`;

    try {
      // Use Qwen Deep Research or similar high-reasoning model
      const provider = this.router.selectProvider({
        prompt,
        contentType: "vision", // HACK: Using 'vision' slot to access Qwen Deep Research if strictly mapped there, or 'script'
        constraints: { minQuality: "high" },
      });

      const completion = await this.openai.chat.completions.create({
        model: provider.name,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" },
      });

      const data = JSON.parse(
        completion.choices[0].message.content || '{"trends": []}',
      );
      return data.trends || [];
    } catch (error) {
      this.logger.error("Trend analysis failed", error);
      // Resilient Fallback
      return [
        { topic: "The Dark Side of AI", score: 82 },
        { topic: "Lost Civilizations Under the Ocean", score: 87 },
      ];
    }
  }
}
