import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require("fluent-ffmpeg");
import { AiService } from "../ai/ai.service";
import { VyroService } from "../vyro/vyro.service";

const streamPipeline = promisify(pipeline);

export interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  engine: string;
  localPath?: string;
  // Metadata for DB
  filename?: string;
  status?: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly engineHealth = new Map<string, boolean>();
  private readonly videoDbPath = path.join(
    process.cwd(),
    "outputs",
    "videos.json",
  );

  constructor(
    private readonly config: ConfigService,
    private readonly aiService: AiService,
    private readonly vyroService: VyroService,
  ) {}

  // ... (generateWithVyro and others remain the same until next step)

  /**
   * Get all videos from persistence
   */
  async getAllVideos(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.videoDbPath)) return [];
      const data = fs.readFileSync(this.videoDbPath, "utf8");
      return JSON.parse(data);
    } catch (e) {
      this.logger.error("Failed to read videos.json", e);
      return [];
    }
  }

  /**
   * Generate video with robust fallback chain (Priority Routing + Circuit Breaker)
   */
  async generateVideo(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const priority = (
      this.config.get<string>("VIDEO_ENGINE_PRIORITY") ||
      "cogvideox,opensora2,svd,vyro,luma"
    )
      .split(",")
      .map((e) => e.trim());

    for (const engine of priority) {
      if (this.engineHealth.get(engine) === false) {
        this.logger.warn(`Skipping ${engine} (circuit open)`);
        continue;
      }

      try {
        let result: VideoGenerationResult | null = null;

        switch (engine) {
          case "svd":
            result = await this.generateWithSVD(prompt, duration);
            break;
          case "vyro":
            result = await this.generateWithVyro(prompt, duration);
            break;
          case "luma":
            result = await this.generateWithLuma(prompt, duration);
            break;
          case "cogvideox":
            result = await this.generateWithCogVideoX(prompt, duration);
            break;
          case "opensora2":
            result = await this.generateWithOpenSora2(prompt, duration);
            break;
          case "runway":
            result = await this.generateWithRunway(prompt, duration);
            break;
          case "placeholder":
            result = await this.generateWithPlaceholder(prompt, duration);
            break;
          default:
            this.logger.warn(`Unknown engine: ${engine}`);
            break;
        }

        if (result) {
            // Ensure we have a local path for uploading if one wasn't provided by the engine
            if (result.videoUrl && !result.localPath) {
                try {
                    const safeTitle = prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                    const filename = `video_${safeTitle}_${Date.now()}.mp4`;
                    this.logger.log(`Downloading video from ${engine} for upload: ${filename}`);
                    result.localPath = await this.downloadVideo(result.videoUrl, filename);
                } catch (downloadError) {
                    this.logger.warn(`Failed to download video from ${engine}: ${downloadError.message}`);
                    // We continue even if download fails, but localPath will be missing
                }
            }
            return result;
        }

      } catch (err) {
        this.logger.warn(`${engine} failed, opening circuit`, err);
        this.engineHealth.set(engine, false);
        // Optional: auto-reset circuit after 10 mins
        setTimeout(() => this.engineHealth.delete(engine), 10 * 60_000);
      }
    }

    throw new Error("All video engines failed");
  }

  /**
   * Generate video using Vyro API (Text‑to‑Video)
   */
  async generateWithVyro(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const token = this.config.get<string>("IMAGINE_TOKEN");
    if (!token) {
      throw new Error("IMAGINE_TOKEN not configured for Vyro");
    }

    try {
      this.logger.log("Generating video with Vyro...");
      // By default use text-to-video for generic prompts
      const result = await this.vyroService.generateTextToVideo(prompt);

      // Vyro returns URL or we might need to poll depending on exact API,
      // but VyroService returns result.data directly.
      // Assuming result has a url property based on typical Imagine/Vyro responses.
      const videoUrl = result?.url || result?.video_url || result?.data?.url;

      if (!videoUrl) {
        throw new Error("Vyro generation returned no URL");
      }

      return {
        videoUrl,
        duration,
        engine: "vyro",
      };
    } catch (error) {
      this.logger.error("Vyro generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Luma Dream Machine API
   */
  async generateWithLuma(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("LUMA_API_KEY");
    if (!apiKey) {
      throw new Error("Luma API key not configured");
    }

    try {
      this.logger.log("Generating video with Luma Dream Machine...");

      const response = await axios.post(
        "https://api.lumalabs.ai/dream-machine/v1/generations",
        {
          prompt,
          aspect_ratio: "9:16",
          loop: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const generationId = response.data.id;
      this.logger.log(`Luma generation started: ${generationId}`);

      let videoUrl: string | null = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusResponse = await axios.get(
          `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );

        if (statusResponse.data.state === "completed") {
          videoUrl = statusResponse.data.assets.video;
          this.logger.log("Luma video generation completed");
        } else if (statusResponse.data.state === "failed") {
          throw new Error("Luma generation failed");
        }

        attempts++;
      }

      if (!videoUrl) {
        throw new Error("Luma generation timed out");
      }

      return {
        videoUrl,
        duration,
        engine: "luma",
      };
    } catch (error) {
      this.logger.error("Luma generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Runway Gen-3 (fallback)
   */
  async generateWithRunway(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("RUNWAY_API_KEY");
    if (!apiKey) {
      throw new Error("Runway API key not configured");
    }

    try {
      this.logger.log("Generating video with Runway Gen-3...");

      const response = await axios.post(
        "https://api.runwayml.com/v1/generate",
        {
          prompt,
          duration,
          resolution: "1080x1920",
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const videoUrl = response.data.output_url;

      return {
        videoUrl,
        duration,
        engine: "runway",
      };
    } catch (error) {
      this.logger.error("Runway generation failed", error);
      throw error;
    }
  }

  // New placeholder video generation (free) method
  async generateWithPlaceholder(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    // Use a public sample video URL as a free fallback
    const placeholderUrl =
      "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    this.logger.log(`Returning placeholder video for prompt: ${prompt}`);
    return {
      videoUrl: placeholderUrl,
      duration,
      engine: "placeholder",
    };
  }

  /**
   * Generate video using Stable Video Diffusion (Local)
   */
  async generateWithSVD(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const svdUrl = this.config.get<string>("SVD_API_URL");
    if (!svdUrl) {
      throw new Error("SVD API URL not configured");
    }

    try {
      this.logger.log(
        "Generating video with SVD (requires image generation first)...",
      );

      // 1. Generate Image from Text (DALL-E 3)
      let imageUrl: string;
      try {
        imageUrl = await this.aiService.generateImage(prompt);
        this.logger.log(`Base image generated: ${imageUrl}`);
      } catch (imgError) {
        this.logger.warn(
          `Image generation failed, using fallback for SVD: ${imgError.message}`,
        );
        // Use a dynamic placeholder based on the prompt keywords or generic news
        imageUrl = `https://placehold.co/1024x576/png?text=${encodeURIComponent(prompt.substring(0, 20))}`;
      }

      // 2. Call SVD API (FastAPI)
      this.logger.log("Calling SVD API...");
      const response = await axios.post(`${svdUrl}/generate`, {
        image_url: imageUrl,
        seed: 42,
        motion_bucket_id: 127,
      });

      const { video_url } = response.data;
      if (!video_url) {
        throw new Error("SVD response missing video_url");
      }

      this.logger.log(`SVD generation completed: ${video_url}`);

      return {
        videoUrl: video_url,
        duration: 4,
        engine: "svd",
      };
    } catch (error) {
      this.logger.error("SVD generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using CogVideoX
   */
  async generateWithCogVideoX(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    // Token is optional for local CogVideoX
    const token =
      this.config.get<string>("IMAGINE_TOKEN") ||
      this.config.get<string>("COGVIDEON_API_KEY") ||
      "";

    // Default to port 7861 for CogVideoX T2V
    const endpoint =
      this.config.get<string>("COGVIDEON_ENDPOINT") ||
      "http://localhost:7861"; // Base URL without /generate
      
    // Fix endpoint construction if it includes /generate
    const baseUrl = endpoint.endsWith("/generate") 
        ? endpoint.replace("/generate", "") 
        : endpoint;

    this.logger.log(`Generating video with CogVideoX T2V at ${baseUrl}...`);

    try {
      // 1. Submit Job
      const response = await axios.post(
        `${baseUrl}/generate`,
        {
          prompt,
          num_frames: Math.min(Math.floor(duration * 8), 49),
          num_inference_steps: 50,
        },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        },
      );

      const { filename, status } = response.data;
      if (status !== "queued") {
          throw new Error(`Unexpected status from CogVideoX: ${status}`);
      }
      
      this.logger.log(`CogVideoX job queued: ${filename}. Waiting for completion...`);

      // 2. Poll for Completion
      let completed = false;
      let checkCount = 0;
      const maxChecks = 100; // 500s timeout (5s interval)
      
      while (!completed && checkCount < maxChecks) {
          await new Promise(r => setTimeout(r, 5000));
          checkCount++;
          
          try {
              const videosResponse = await axios.get(`${baseUrl}/videos`);
              const videos = videosResponse.data;
              const job = videos.find((v: any) => v.filename === filename);
              
              if (job) {
                  this.logger.debug(`Job ${filename} status: ${job.status}`);
                  if (job.status === "completed") {
                      completed = true;
                  } else if (job.status === "failed") {
                      throw new Error(`CogVideoX generation failed: ${job.error || 'Unknown error'}`);
                  }
              }
          } catch (pollError) {
              this.logger.warn(`Polling failed: ${pollError.message}`);
          }
      }
      
      if (!completed) {
          throw new Error("CogVideoX generation timed out");
      }

      this.logger.log(`CogVideoX generation completed.`);

      const videoUrl = `${baseUrl}/outputs/${filename}`;

      return {
        videoUrl,
        duration,
        engine: "cogvideox",
      };
    } catch (error) {
      this.logger.error("CogVideoX generation failed", error);
      throw error;
    }
  }

  // New OpenSora2 video generation method
  async generateWithOpenSora2(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint =
      this.config.get<string>("OPENSORA2_ENDPOINT") ||
      "http://localhost:8000/generate";
    const numFrames = Math.min(Math.floor(duration * 8), 49);
    const frameUrls: string[] = [];
    for (let i = 0; i < numFrames; i++) {
      try {
        const resp = await axios.post(endpoint, { prompt, frame_index: i });
        if (resp.data && resp.data.frame_url) {
          frameUrls.push(resp.data.frame_url);
        }
      } catch (e) {
        this.logger.warn(`OpenSora2 frame ${i} generation failed`, e);
      }
    }
    // Assume the service can assemble frames into a video URL
    const videoUrl = `${endpoint}/assemble?frames=${frameUrls.join(",")}`;
    return {
      videoUrl,
      duration,
      engine: "opensora2",
    };
  }

  /**
   * Generate video with automatic fallback
   */

  /**
   * Download video from URL to local storage
   */
  async downloadVideo(videoUrl: string, filename: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), "uploads", "videos");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localPath = path.join(uploadDir, filename);

    try {
      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
      });

      await streamPipeline(response.data, fs.createWriteStream(localPath));

      this.logger.log(`Video downloaded to: ${localPath}`);
      return localPath;
    } catch (error) {
      this.logger.error("Failed to download video", error);
      throw error;
    }
  }

  /**
   * Generate video from script scenes
   */
  async generateFromScript(script: any): Promise<{
    results: VideoGenerationResult[];
    successCount: number;
    failedScenes: number[];
  }> {
    const results: VideoGenerationResult[] = [];
    const failedScenes: number[] = [];

    for (const scene of script.scenes) {
      try {
        const result = await this.generateVideo(
          scene.visualPrompt,
          scene.duration,
        );
        results.push(result);
      } catch (error) {
        failedScenes.push(scene.sceneNumber);
        this.logger.error(`Scene ${scene.sceneNumber} failed`, error);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      results,
      successCount: results.length,
      failedScenes,
    };
  }

  async mergeAudio(videoPath: string, audioPath: string): Promise<string> {
    const outputPath = videoPath.replace(".mp4", "_with_audio.mp4");
    this.logger.log(`Merging audio: ${videoPath} + ${audioPath} -> ${outputPath}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(audioPath)
        .outputOptions([
          "-c:v copy", // Copy video stream (no re-encode)
          "-c:a aac",  // Re-encode audio to AAC
          "-map 0:v:0", // Use video from first input
          "-map 1:a:0", // Use audio from second input
          "-shortest",  // Cut to shortest stream length
        ])
        .save(outputPath)
        .on("end", () => {
          this.logger.log("Audio merge completed");
          resolve(outputPath);
        })
        .on("error", (err) => {
          this.logger.error("Audio merge failed", err);
          reject(err);
        });
    });
  
}
}
