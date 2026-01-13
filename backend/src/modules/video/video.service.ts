import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiService } from "../ai/ai.service";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import ffmpeg from "fluent-ffmpeg";

const streamPipeline = promisify(pipeline);

export interface VideoGenerationResult {
  videoUrl?: string;
  localPath?: string;
  duration?: number;
  engine: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly engineHealth = new Map<string, boolean>();

  constructor(
    private readonly config: ConfigService,
    private readonly aiService: AiService
  ) {
    this.videoDbPath = path.join(process.cwd(), "uploads", "videos", "metadata.json");
  }

  private readonly videoDbPath: string;

  /**
   * Get all generated videos from the metadata file
   */
  public async getAllVideos(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.videoDbPath)) return [];
      const data = fs.readFileSync(this.videoDbPath, "utf8");
      return JSON.parse(data);
    } catch (err) {
      this.logger.error("Failed to read video metadata", err);
      return [];
    }
  }

  /**
   * Health check for video engines (circuit breaker)
   */
  async checkEngineHealth(engine: string): Promise<boolean> {
    // Placeholder engine is always healthy for testing
    if (engine === "placeholder") return true;

    if (this.engineHealth.has(engine) && !this.engineHealth.get(engine)) {
      return false;
    }

    try {
      const endpoint = this.config.get<string>(
        `${engine.toUpperCase()}_HEALTH_ENDPOINT`
      );
      if (!endpoint) return true; // Assume healthy if no endpoint configured

      const response = await axios.get(endpoint, { timeout: 3000 });
      const isHealthy = response.status === 200;
      this.engineHealth.set(engine, isHealthy);
      return isHealthy;
    } catch (err) {
      this.logger.warn(`Health check failed for ${engine}: ${err.message}`);
      this.engineHealth.set(engine, false);
      return false;
    }
  }

  /**
   * Main entry point for video generation with fallback logic.
   */
  async generateVideo(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const priority = this.config
      .get<string>("VIDEO_ENGINE_PRIORITY", "cosmos,veo,cogvideox,svd,placeholder")
      .split(",")
      .map((e) => e.trim());

    // Optionally refine the prompt using Nemotron Nano
    let finalPrompt = prompt;
    if (this.config.get<boolean>("REFINE_VIDEO_PROMPTS", true)) {
      try {
        finalPrompt = await this.aiService.refineVideoPrompt(prompt);
      } catch (err) {
        this.logger.warn("Prompt refinement failed, using raw prompt", err);
      }
    }

    for (const engine of priority) {
      const isHealthy = await this.checkEngineHealth(engine);
      if (!isHealthy) {
        this.logger.warn(`Engine ${engine} is unhealthy, skipping`);
        continue;
      }

      try {
        let result: VideoGenerationResult | null = null;

        switch (engine) {
          case "cosmos":
            result = await this.generateWithNvidiaCosmos(finalPrompt, duration);
            break;
          case "veo":
            result = await this.generateWithVeo(finalPrompt, duration);
            break;
          case "cogvideox":
            result = await this.generateWithCogVideoX(finalPrompt, duration);
            break;
          case "svd":
            result = await this.generateWithSVD(finalPrompt, duration);
            break;
          case "placeholder":
            result = await this.generateWithPlaceholder(finalPrompt, duration);
            break;
          default:
            this.logger.warn(`Unknown engine: ${engine}`);
        }

        if (result) {
          // Ensure we have a local path for uploading if one wasn't provided by the engine
          if (result.videoUrl && !result.localPath) {
            try {
              const safeTitle = prompt
                .replace(/[^a-z0-9]/gi, "_")
                .substring(0, 30);
              const filename = `video_${safeTitle}_${Date.now()}.mp4`;
              this.logger.log(
                `Downloading video from ${engine} for upload: ${filename}`
              );
              result.localPath = await this.downloadVideo(
                result.videoUrl,
                filename
              );
            } catch (downloadError) {
              this.logger.warn(
                `Failed to download video from ${engine}: ${downloadError.message}`
              );
              // We continue even if download fails, but localPath will be missing
            }
          }
          
          // Attach the refined prompt to the result if it was changed
          if (finalPrompt !== prompt) {
            (result as any).refinedPrompt = finalPrompt;
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

    throw new Error("All video generation engines failed");
  }

  /**
   * Helper to download a video from a URL.
   */
  async downloadVideo(url: string, filename: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), "uploads", "videos");
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
    this.logger.log(`Video downloaded to: ${localPath}`);
    return localPath;
  }

  /**
   * Generate video using CogVideoX local server
   */
  async generateWithCogVideoX(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("COGVIDEOT_ENDPOINT");
    if (!endpoint) {
      throw new Error("CogVideoX endpoint not configured");
    }

    try {
      this.logger.log("Generating video with CogVideoX...");
      const response = await axios.post(`${endpoint}/generate`, {
        prompt,
        num_frames: Math.floor(duration * 8), // Assuming 8 FPS
      });

      const { video_url, local_path } = response.data;
      return {
        videoUrl: video_url,
        localPath: local_path,
        duration,
        engine: "cogvideox",
      };
    } catch (error) {
      this.logger.error("CogVideoX generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using SVD local server
   */
  async generateWithSVD(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("SVD_ENDPOINT");
    if (!endpoint) {
      throw new Error("SVD endpoint not configured");
    }

    try {
      this.logger.log("Generating video with SVD...");
      const response = await axios.post(`${endpoint}/generate`, {
        prompt,
      });

      const { video_url, local_path } = response.data;
      return {
        videoUrl: video_url,
        localPath: local_path,
        duration,
        engine: "svd",
      };
    } catch (error) {
      this.logger.error("SVD generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Luma AI (via API)
   */
  async generateWithLuma(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("LUMA_API_KEY");
    if (!apiKey) {
      throw new Error("Luma API key not configured");
    }

    try {
      this.logger.log("Generating video with Luma...");
      const response = await axios.post(
        "https://api.lumalabs.ai/v1/generations",
        {
          prompt,
          aspect_ratio: "16:9",
          loop: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        videoUrl: response.data.video_url,
        duration,
        engine: "luma",
      };
    } catch (error) {
      this.logger.error("Luma generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Runway Gen‑2 (via API)
   */
  async generateWithRunway(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("RUNWAY_API_KEY");
    if (!apiKey) {
      throw new Error("Runway API key not configured");
    }

    try {
      this.logger.log("Generating video with Runway...");
      // Implementation depends on actual Runway API client or endpoint
      const response = await axios.post(
        "https://api.runwayml.com/v1/generate",
        {
          prompt,
          mode: "gen2",
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      return {
        videoUrl: response.data.output[0],
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
    duration: number = 5
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
   * Generate video using Hugging Face Serverless Inference API (free tier).
   * Expects the model to return a JSON with a `video_url` field.
   */
  async generateWithHF(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("HF_API_TOKEN");
    if (!apiKey) {
      throw new Error("HF API token not configured");
    }

    const modelId =
      this.config.get<string>("HF_MODEL_ID") ||
      "damo-vilab/modelscope-damo-text-to-video-synthesis";

    try {
      this.logger.log(`Generating video with Hugging Face (${modelId})...`);
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelId}`,
        { inputs: prompt },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // The actual response format depends on the HF model's inference widget output
      if (response.data && response.data.video_url) {
        return {
          videoUrl: response.data.video_url,
          duration,
          engine: "hf",
        };
      } else {
        // Some HF models return binary video data langsung
        this.logger.warn("HF model did not return video_url, fallback to placeholder");
        return this.generateWithPlaceholder(prompt, duration);
      }
    } catch (error) {
      this.logger.error("HF generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Hugging Face Video Gen Engine (custom local or API)
   */
  async generateWithHFVideo(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("HF_VIDEO_ENDPOINT");
    if (!endpoint) {
      return this.generateWithPlaceholder(prompt, duration);
    }

    try {
      this.logger.log("Generating video with HF Video Engine...");
      const response = await axios.post(`${endpoint}/generate`, {
        prompt,
      });

      return {
        videoUrl: response.data.video_url,
        localPath: response.data.local_path,
        duration,
        engine: "hf-video",
      };
    } catch (error) {
      this.logger.error("HF Video Engine failed", error);
      throw error;
    }
  }

  /**
   * Generate video using HunyuanVideo (Pokemon LoRA)
   */
  async generateWithHunyuan(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("HUNYUAN_ENDPOINT");
    if (!endpoint) {
      // Fallback to placeholder if not configured
      return this.generateWithPlaceholder(prompt, duration);
    }

    throw new Error("Hunyuan engine not available as a direct service");
  }

  /**
   * Generate video using Google Veo (Gemini API)
   */
  async generateWithVeo(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("VEO_API_KEY");
    if (!apiKey) {
      throw new Error("Veo API key not configured");
    }

    try {
      this.logger.log("Generating video with Veo...");

      // API endpoint for Veo (via Gemini API)
      // Using veo-3.1-generate-preview as discovered from available models.
      const model = "veo-3.1-generate-preview";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`;

      const response = await axios.post(
        endpoint,
        {
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Veo returns a long‑running operation
      const operationName = response.data.name;
      this.logger.log(`Veo operation started: ${operationName}`);

      // Polling for completion (simplified for this walkthrough)
      let videoUrl: string | undefined;
      for (let i = 0; i < 30; i++) {
        const statusResponse = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
        );
        if (statusResponse.data.done) {
          videoUrl = statusResponse.data.response.outputs[0].uri;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!videoUrl) throw new Error("Veo generation timed out");

      return {
        videoUrl,
        duration,
        engine: "veo",
      };
    } catch (error) {
      this.logger.error("Veo generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using NVIDIA Cosmos NIM (High Quality Cloud API)
   */
  async generateWithNvidiaCosmos(
    prompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>("NVIDIA_API_KEY") || this.config.get<string>("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY or OPENROUTER_API_KEY not configured");
    }

    try {
      this.logger.log("Generating video with NVIDIA Cosmos NIM...");
      
      // Using NVIDIA NIM API pattern (OpenAI compatible for some models or specific NIM endpoint)
      // Reference: https://build.nvidia.com/nvidia/cosmos-1_0-predict-text2world-7b
      const response = await axios.post(
        "https://ai.api.nvidia.com/v1/genai/nvidia/cosmos-1_0-predict-text2world-7b",
        {
          "messages": [
            {
              "role": "user",
              "content": prompt
            }
          ],
          "video_settings": {
              "num_frames": Math.min(Math.floor(duration * 24), 120), // Cosmos often caps at certain frames
              "height": 704,
              "width": 1280
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        }
      );

      // NVIDIA Cosmos often returns a base64 string or a preview URL depending on the specific NIM setup.
      // If it returns an ID for polling:
      if (response.data.id) {
          const operationId = response.data.id;
          this.logger.log(`Cosmos generation started: ${operationId}`);
          
          // Polling logic
          for (let i = 0; i < 60; i++) {
              const statusResponse = await axios.get(
                  `https://ai.api.nvidia.com/v1/genai/status/${operationId}`,
                  { headers: { Authorization: `Bearer ${apiKey}` } }
              );
              
              if (statusResponse.data.status === "succeeded") {
                  return {
                      videoUrl: statusResponse.data.video.url,
                      duration,
                      engine: "cosmos",
                  };
              }
              if (statusResponse.data.status === "failed") {
                  throw new Error(`Cosmos generation failed: ${statusResponse.data.error}`);
              }
              await new Promise(r => setTimeout(r, 5000));
          }
          throw new Error("Cosmos generation timed out");
      }

      // Fallback: If it returns direct URL
      return {
        videoUrl: response.data.video_url || response.data.url,
        duration,
        engine: "cosmos",
      };
    } catch (error) {
      this.logger.error("NVIDIA Cosmos generation failed", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate videos for all scenes in a script
   */
  public async generateFromScript(script: any): Promise<VideoGenerationResult> {
    if (script && script.scenes) {
      const prompts = script.scenes.map((s: any) => s.visualPrompt || s.description);
      return this.generateAndMergeScenes(prompts);
    }
    throw new Error("Invalid script format");
  }

  /**
   * Helper to merge audio into video using FFmpeg
   */
  async mergeAudio(videoPath: string, audioPath: string): Promise<string> {
    const outputPath = videoPath.replace(".mp4", "_with_audio.mp4");
    this.logger.log(
      `Merging audio: ${videoPath} + ${audioPath} -> ${outputPath}`
    );

    return new Promise((resolve, reject) => {
      (ffmpeg(videoPath) as any)
        .input(audioPath)
        .outputOptions([
          "-c:v copy", // Copy video stream (no re-encode)
          "-c:a aac", // Re-encode audio to AAC
          "-map 0:v:0", // Use video from first input
          "-map 1:a:0", // Use audio from second input
          "-shortest", // Cut to shortest stream length
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

  /**
   * Helper to generate multiple scenes and merge them
   */
  async generateAndMergeScenes(
    prompts: string[],
    durationPerScene: number = 5
  ): Promise<VideoGenerationResult> {
    const results: string[] = [];
    const failedScenes: number[] = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await this.generateVideo(prompts[i], durationPerScene);
        if (result.localPath) {
          results.push(result.localPath);
        } else if (result.videoUrl) {
          const filename = `scene_${i}_${Date.now()}.mp4`;
          const localPath = await this.downloadVideo(result.videoUrl, filename);
          results.push(localPath);
        }
      } catch (err) {
        this.logger.error(`Failed to generate scene ${i}`, err);
        failedScenes.push(i);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Merge logic would go here using ffmpeg merge
    // For now returning the first available scene
    return {
      localPath: results[0],
      duration: results.length * durationPerScene,
      engine: "merged",
    };
  }
}
