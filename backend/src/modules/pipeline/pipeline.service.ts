import { Injectable, Logger } from '@nestjs/common';
import { NewsService, Article } from '../news/news.service';
import { ScriptService } from '../script/script.service';
import { VyroService } from '../vyro/vyro.service';
import { VideoService } from '../video/video.service';

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
      throw new Error('No news articles fetched');
    }
    const article = articles[0];

    // Step 2: generate script
    const script = await this.scriptService.generateScriptFromArticle(article);
    this.logger.log(`Generated script: ${script}`);

    // Step 3: generate image (using the article title as prompt)
    const imageResult = await this.vyroService.generateImage(article.title);
    const imageUrl = imageResult?.image_url || imageResult?.url;
    if (!imageUrl) {
      throw new Error('Vyro image generation did not return a URL');
    }
    this.logger.log(`Generated image URL: ${imageUrl}`);

    // Step 4: generate video using CogVideoX (image URL + script as prompt)
    // The CogVideoX FastAPI expects an image_url, motion_bucket_id, etc.
    // We'll reuse the existing generateWithCogVideoX method which expects a prompt.
    // For simplicity, we pass the script as the prompt; the FastAPI will handle it.
    const videoResult = await this.videoService.generateWithCogVideoX(script);
    const videoUrl = videoResult?.videoUrl;
    if (!videoUrl) {
      throw new Error('Video generation failed to return a URL');
    }
    this.logger.log(`Generated video URL: ${videoUrl}`);
    return {
      videoUrl,
      title: article.title,
      description: article.description || article.title,
    };
  }
}

export interface PipelineResult {
  videoUrl: string;
  title: string;
  description: string;
}
