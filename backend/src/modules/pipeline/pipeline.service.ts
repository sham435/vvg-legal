import { Injectable, Logger } from "@nestjs/common";
import { NewsService, Article } from "../news/news.service";
import { ScriptService } from "../script/script.service";
import { VyroService } from "../vyro/vyro.service";
import { VideoService } from "../video/video.service";

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly scriptService: ScriptService,
    private readonly vyroService: VyroService,
    private readonly videoService: VideoService,
  ) {}

  /**
   * Orchestrates the full media generation pipeline:
   * 1. Fetch a top‑headline article.
   * 2. Generate a short script from the article.
   * 3. Generate a representative image via Vyro.
   * 4. Generate a video using the CogVideoX engine (or fallback).
   * Returns the final video URL and metadata.
   */
  async runPipeline(): Promise<PipelineResult> {
    // Step 1: fetch news
    const articles: Article[] = await this.newsService.fetchTopHeadlines();
    if (!articles.length) {
      throw new Error("No news articles fetched");
    }
    const article = articles[0];

    // Step 2: generate script
    const script = await this.scriptService.generateScriptFromArticle(article);
    this.logger.log(`Generated script: ${script}`);

    // Step 3: generate image (using the article title as prompt)
    let imageUrl: string;
    try {
      const imageResult = await this.vyroService.generateImage(article.title);
      imageUrl = imageResult?.image_url || imageResult?.url;
      if (!imageUrl) throw new Error("No URL returned");
    } catch (error) {
      this.logger.warn(
        "Vyro image generation failed. Using fallback image.",
        error.message,
      );
      imageUrl = "https://placehold.co/600x400?text=Breaking+News";
    }

    this.logger.log(`Generated image URL: ${imageUrl}`);

    // Step 4: generate video using the robust router (priority + circuit breaker)
    let videoUrl: string | undefined;
    let localPath: string | undefined;

    try {
      const videoResult = await this.videoService.generateVideo(script);
      videoUrl = videoResult?.videoUrl;
      localPath = videoResult?.localPath;
      
      if (localPath) {
          this.logger.log(`Video available at: ${localPath}`);
      }
    } catch (error) {
      this.logger.error(
        "All video engines failed. Falling back to Article mode.",
        error,
      );
      // Fallback: Proceed without videoUrl
    }

    // Step 5: Return result (Video or Article)
    if (videoUrl) {
      this.logger.log(`Generated video URL: ${videoUrl}`);
      return {
        type: "video",
        url: videoUrl,
        title: article.title,
        description: article.description || article.title,
        localPath: localPath,
      };
    } else {
      this.logger.log("Returning Article (fallback)");
      return {
        type: "article",
        url: imageUrl, // Use the generated image as the main asset
        title: article.title,
        description: article.description || article.title,
        text: script, // Return the full script as article text
      };
    }
  }

}

export interface PipelineResult {
  type: "video" | "article";
  url: string;
  title: string;
  description: string;
  text?: string;
  localPath?: string;
}
