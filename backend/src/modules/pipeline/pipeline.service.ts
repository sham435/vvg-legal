import { Injectable, Logger } from "@nestjs/common";
import { NewsService, Article } from "../news/news.service";
import { ScriptService } from "../script/script.service";
import { VyroService } from "../vyro/vyro.service";
import { VideoService } from "../video/video.service";
import { MusicService } from "../music/music.service";
import { PublishService } from "../publish/publish.service";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { promisify } from "util";
import { pipeline } from "stream";

const streamPipeline = promisify(pipeline);

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly scriptService: ScriptService,
    private readonly vyroService: VyroService,
    private readonly videoService: VideoService,
    private readonly musicService: MusicService,
    private readonly publishService: PublishService,
  ) {}

  /**
   * Orchestrates the full media generation pipeline:
   * 1. Fetch a top‑headline article.
   * 2. Generate a short script from the article.
   * 3. Generate a representative image via Vyro.
   * 4. Generate a video using the CogVideoX engine (or fallback).
   * 5. Generate and merge background music.
   * Returns the final video URL and metadata.
   */
  async runPipeline(customArticle?: Article): Promise<PipelineResult> {
    // Step 1: fetch news
    let article: Article;
    if (customArticle) {
      article = customArticle;
    } else {
      const articles: Article[] = await this.newsService.fetchTopHeadlines();
      if (!articles.length) {
        throw new Error("No news articles fetched");
      }
      article = articles[0];
    }

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
          
          // Step 5: Add background music
          try {
             this.logger.log("Searching for background music...");
             const musicSearch = await this.musicService.search("cinematic news background " + article.title.substring(0,20));
             if (musicSearch && musicSearch.results && musicSearch.results.length > 0) {
                 const track = musicSearch.results[0];
                 this.logger.log(`Downloading music: ${track.title} (${track.url})`);
                 
                 const audioPath = await this.downloadFile(track.url, `audio_${Date.now()}.mp3`);
                 this.logger.log(`Audio downloaded to: ${audioPath}`);
                 
                 const mergedPath = await this.videoService.mergeAudio(localPath, audioPath);
                 localPath = mergedPath;
                 this.logger.log(`Final video with audio: ${localPath}`);
             } else {
                 this.logger.warn("No music found for video");
             }
          } catch(musicError) {
             this.logger.error("Failed to add background music", musicError);
             // Proceed with silent video
          }
      }
    } catch (error) {
      this.logger.error(
        "❌ Video generation stage failed. Falling back to Article mode.",
        error.message || error,
      );
      // Fallback: Proceed without videoUrl
    }

    // Step 5: Return result (Video or Article)
  if (videoUrl || localPath) {
      this.logger.log(`Generated video URL: ${videoUrl}`);
      
      const result: PipelineResult = {
        type: "video",
        url: videoUrl,
        title: article.title,
        description: article.description || article.title,
        localPath: localPath,
      };

      // Step 6: Auto-publish if localPath exists
      if (localPath) {
          this.logger.log(`🚀 Attempting auto-publish to YouTube: ${result.title}`);
          try {
              await this.publishService.uploadToYouTube(
                  localPath,
                  result.title,
                  result.description
              );
              this.logger.log("✅ Auto-published successfully");
          } catch (pubError) {
              this.logger.error(`❌ Auto-publishing failed: ${pubError.message}`);
          }
      } else {
          this.logger.warn("⚠️ Skipping YouTube upload: Video URL exists but local file path is missing (Download failed?)");
      }

      return result;
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

  private async downloadFile(url: string, filename: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localPath = path.join(uploadDir, filename);
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });
    await streamPipeline(response.data, fs.createWriteStream(localPath));
    return localPath;
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
