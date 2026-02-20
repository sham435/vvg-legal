import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { NewsService, Article } from "../news/news.service";
import { AiService } from "../ai/ai.service"; // Added import for AiService

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);
  private readonly openAiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly newsService: NewsService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generate a concise video script from a news article.
   * The script is a short paragraph (~30‑60 words) suitable for feeding into a video generation model.
   */
  async generateScriptFromArticle(article: Article): Promise<string> {
    const topic = article.title;
    try {
      const script = await this.aiService.generateScript(topic);
      // Construct a string format script from the VideoScript object
      const fullScript = `${script.hook}\n\n${script.scenes.map((s) => s.narration).join(" ")}\n\n${script.hashtags.join(" ")}`;
      return fullScript;
    } catch (error) {
      this.logger.warn(
        "Failed to generate script via AiService (Nemotron). Using fallback script.",
        error.message,
      );
      // Fallback: Create a simple script from title and description
      const safeDescription =
        article.description || "Check out this breaking story.";
      return `Here is the latest update: ${article.title}. ${safeDescription} Stay tuned for more coverage.`;
    }
  }

  /**
   * Generate a full cinematic VideoScript from a news article.
   */
  async generateCinematicScriptFromArticle(article: Article): Promise<any> {
    const topic = article.title;
    try {
      return await this.aiService.generateCinematicScript(
        topic,
        article.description,
      );
    } catch (error) {
      this.logger.error("Failed to generate cinematic script", error);
      // Fallback to basic generateScript format but wrapped in object
      const basicScript = await this.aiService.generateScript(
        topic,
        article.description,
      );
      return basicScript;
    }
  }
}
