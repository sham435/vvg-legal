import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiService } from "../ai/ai.service";
import { EngagementPredictor } from "../../ai/intelligence/engagement-predictor";
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
    private readonly aiService: AiService,
    private readonly engagementPredictor?: EngagementPredictor,
  ) {
    this.videoDbPath = path.join(
      process.cwd(),
      "uploads",
      "videos",
      "metadata.json",
    );
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    const dir = path.join(process.cwd(), "uploads", "videos");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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
   * Save video metadata to JSON store
   */
  private saveVideoMetadata(metadata: any) {
    try {
      const videos = fs.existsSync(this.videoDbPath)
        ? JSON.parse(fs.readFileSync(this.videoDbPath, "utf8"))
        : [];

      videos.unshift(metadata); // Add new video to top

      // Limit history to last 100 videos
      if (videos.length > 100) videos.length = 100;

      fs.writeFileSync(this.videoDbPath, JSON.stringify(videos, null, 2));
      this.logger.log(`Saved video metadata to ${this.videoDbPath}`);
    } catch (err) {
      this.logger.error("Failed to save video metadata", err);
    }
  }

  /**
   * Health check for video engines (circuit breaker)
   */
  async checkEngineHealth(engine: string): Promise<boolean> {
    const endpointKey = `${engine.toUpperCase()}_HEALTH_ENDPOINT`;
    const endpoint = this.config.get<string>(endpointKey);

    this.logger.debug(
      `Checking health for ${engine} using ${endpointKey}: ${endpoint}`,
    );

    try {
      if (!endpoint) {
        this.logger.debug(`No health endpoint for ${engine}, assuming healthy`);
        return true;
      }

      const response = await axios.get(endpoint, { timeout: 3000 });
      const isHealthy = response.status === 200;
      this.engineHealth.set(engine, isHealthy);
      return isHealthy;
    } catch (err) {
      this.logger.warn(
        `Health check failed for ${engine} (${endpoint}): ${err.message}`,
      );
      this.engineHealth.set(engine, false);
      return false;
    }
  }

  /**
   * Main entry point for video generation with fallback logic.
   *
   * @param prompt Video generation prompt
   * @param duration Video duration in seconds
   * @param topic Optional topic for pre-generation scoring (extracted from prompt if not provided)
   * @param skipScoring Optional flag to bypass pre-generation scoring
   */
  public async generateVideo(
    prompt: string,
    duration: number = 5,
    topic?: string,
    skipScoring: boolean = false,
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    this.logger.log(
      `Starting video generation for prompt: ${prompt.substring(0, 50)}...`,
    );

    // Pre-generation scoring (optional, configurable)
    const enablePreScoring = this.config.get<boolean>(
      "ENABLE_PRE_GENERATION_SCORING",
      true,
    );
    const scoringThreshold = this.config.get<number>(
      "PRE_GENERATION_SCORING_THRESHOLD",
      60,
    );

    if (enablePreScoring && !skipScoring && this.engagementPredictor) {
      try {
        const extractedTopic = topic || prompt.substring(0, 100); // Use first 100 chars as topic if not provided
        this.logger.log(
          `🔍 Pre-generation scoring enabled. Evaluating prompt potential...`,
        );

        const score = await this.engagementPredictor.predictViralScore(
          prompt,
          extractedTopic,
        );

        this.logger.log(
          `📊 Viral Score: ${score.totalScore}/100 ` +
            `(Hook: ${score.metrics.hookStrength}, Pacing: ${score.metrics.pacingScore}, ` +
            `Emotion: ${score.metrics.emotionalImpact}, Trend: ${score.metrics.trendAlignment})`,
        );

        if (score.totalScore < scoringThreshold) {
          const errorMessage = `Pre-generation scoring failed: Score ${score.totalScore} below threshold ${scoringThreshold}. Suggestions: ${score.suggestions.join(", ")}`;
          this.logger.warn(`⛔ ${errorMessage}`);
          throw new Error(errorMessage);
        }

        this.logger.log(
          `✅ Pre-generation scoring passed (${score.totalScore} >= ${scoringThreshold}). Proceeding with generation.`,
        );

        // Log suggestions for improvement (even if passed)
        if (score.suggestions.length > 0) {
          this.logger.debug(`💡 Suggestions: ${score.suggestions.join("; ")}`);
        }
      } catch (err) {
        // If scoring fails, check if we should proceed or abort
        const abortOnScoringFailure = this.config.get<boolean>(
          "ABORT_ON_SCORING_FAILURE",
          false,
        );

        if (abortOnScoringFailure) {
          this.logger.error(
            "Pre-generation scoring failed and ABORT_ON_SCORING_FAILURE is enabled",
            err,
          );
          throw err;
        } else {
          this.logger.warn(
            "Pre-generation scoring failed but continuing (ABORT_ON_SCORING_FAILURE=false)",
            err,
          );
        }
      }
    } else if (enablePreScoring && !this.engagementPredictor) {
      this.logger.warn(
        "Pre-generation scoring enabled but EngagementPredictor not available. Proceeding without scoring.",
      );
    }

    const priority = this.config
      .get<string>(
        "VIDEO_ENGINE_PRIORITY",
        "wan-1.3b,ltx-video,hunyuan-video,wan-2.1,silicon-flow",
      )
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

    const errors: string[] = [];
    for (const engine of priority) {
      if (engine === "nemotron-nano") continue; // Keep as safety guard

      const isHealthy = await this.checkEngineHealth(engine);
      if (!isHealthy) {
        this.logger.warn(`Engine ${engine} is unhealthy, skipping`);
        errors.push(`${engine}: unhealthy`);
        continue;
      }

      try {
        let result: VideoGenerationResult | null = null;
        this.logger.log(`Attempting video generation with engine: ${engine}`);

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
          case "wan-1.3b":
          case "wan-2.1":
            result = await this.generateWithWan(finalPrompt, duration);
            break;
          case "ltx-video":
            result = await this.generateWithLTX(finalPrompt, duration);
            break;
          default:
            this.logger.warn(`Unknown engine: ${engine}`);
            continue;
        }

        if (result && (result.videoUrl || result.localPath)) {
          const timeTaken = Date.now() - startTime;
          this.logger.log(
            `Generation successful with ${engine} in ${timeTaken}ms`,
          );

          // Persist metadata for Dashboard
          this.saveVideoMetadata({
            ...result,
            prompt: finalPrompt,
            createdAt: new Date(),
            engine,
          });

          return { ...result, engine };
        }
      } catch (err) {
        this.logger.error(`Engine ${engine} failed: ${err.message}`);
        errors.push(`${engine}: ${err.message}`);
        this.engineHealth.set(engine, false);
        // Optional: auto-reset circuit after 10 mins
        setTimeout(() => this.engineHealth.delete(engine), 10 * 60_000);
      }
    }

    const errorMessage = `All video generation engines failed: ${errors.join(", ")}`;
    this.logger.error(errorMessage);
    throw new Error(errorMessage);
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
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("COGVIDEOX_ENDPOINT");
    if (!endpoint) {
      throw new Error("CogVideoX endpoint not configured");
    }

    try {
      this.logger.log("Generating video with CogVideoX...");
      const response = await axios.post(
        `${endpoint}/generate`,
        {
          prompt,
          num_frames: Math.min(Math.floor(duration * 8), 16), // Cap at 16 frames for local stability
        },
        { timeout: 180000 },
      ); // 180s timeout

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
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("SVD_ENDPOINT");
    if (!endpoint) {
      throw new Error("SVD endpoint not configured");
    }

    try {
      this.logger.log("Generating video with SVD...");
      // NO PLACEHOLDER: removed generateWithPlaceholder() logic.
      // Explicit error is thrown if this fails.
      const response = await axios.post(
        `${endpoint}/generate`,
        {
          prompt, // SVD prompt or initial image logic
        },
        { timeout: 300000 },
      ); // 300s timeout

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
   * Generate video using Wan 2.1 (T2V-1.3B) local server
   * Optimized for Consumer GPUs (8GB VRAM) -> 480p default
   */
  async generateWithWan(
    prompt: string,
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("WAN_ENDPOINT"); // e.g. http://wan-service:8000
    if (!endpoint) {
      throw new Error("Wan 2.1 endpoint not configured");
    }

    try {
      this.logger.log("Generating video with Wan 2.1 (T2V-1.3B)...");

      // Official Parameters for 1.3B Model (Consumer GPU Optimized)
      // Size: 832*480 (480p)
      // Guide Scale: 6 (Recommended for stability)
      // Sample Shift: 8 (Recommended range 8-12)
      const response = await axios.post(
        `${endpoint}/generate`,
        {
          prompt,
          task: "t2v-1.3b",
          size: "832*480", // Explicit resolution as per docs
          sample_guide_scale: 6,
          sample_shift: 8,
          offload_model: true, // Auto-offload for 8GB VRAM support
          t5_cpu: true, // Offload text encoder to CPU to save VRAM
          duration: duration,
        },
        { timeout: 600000 }, // 10 min timeout
      );

      const { video_url, local_path } = response.data;
      return {
        videoUrl: video_url,
        localPath: local_path,
        duration,
        engine: "wan-1.3b",
      };
    } catch (error) {
      this.logger.error("Wan 2.1 generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using LTX-Video (Lightricks DiT-based model)
   * Real-time capable, 30 FPS at 1216×704 resolution
   *
   * Model constraints:
   * - Resolution must be divisible by 32
   * - Number of frames must be divisible by 8 + 1 (e.g., 257)
   * - Best on resolutions under 720 x 1280
   * - Frames below 257 recommended
   *
   * Supports multiple variants:
   * - ltxv-13b-0.9.8-dev (highest quality)
   * - ltxv-13b-0.9.8-distilled (faster, less VRAM)
   * - ltxv-2b-0.9.8-distilled (light VRAM usage)
   * - fp8 quantized versions available
   */
  async generateWithLTX(
    prompt: string,
    duration: number = 5,
    inputImagePath?: string,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("LTX_ENDPOINT");
    if (!endpoint) {
      throw new Error("LTX-Video endpoint not configured");
    }

    try {
      this.logger.log("Generating video with LTX-Video...");

      // Calculate optimal resolution and frame count based on constraints
      // Target: 704x1216 (under 720x1280 limit, divisible by 32)
      // For faster generation, use smaller: 480x832 (divisible by 32)
      const targetWidth = 832; // Divisible by 32
      const targetHeight = 480; // Divisible by 32, under 720 limit

      // Calculate frames: divisible by 8 + 1, below 257
      // For 5 seconds at 30 FPS = 150 frames
      // Nearest valid: 153 (152 + 1, where 152 is divisible by 8)
      // For shorter videos, use: 97 (96 + 1), 65 (64 + 1), 33 (32 + 1), 17 (16 + 1)
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);
      // Round down to nearest (8n + 1) where n is integer
      const validFrames = Math.max(
        17,
        Math.min(257, Math.floor((totalFrames - 1) / 8) * 8 + 1),
      );

      // Model variant selection (default to distilled for speed)
      const modelVariant = this.config.get<string>(
        "LTX_MODEL_VARIANT",
        "ltxv-13b-0.9.8-distilled",
      );

      const requestBody: any = {
        prompt,
        height: targetHeight,
        width: targetWidth,
        num_frames: validFrames,
        pipeline_config: `configs/${modelVariant}.yaml`,
        seed: Math.floor(Math.random() * 1000000),
      };

      // Add input image if provided (for image-to-video)
      if (inputImagePath) {
        requestBody.input_image_path = inputImagePath;
      }

      const response = await axios.post(
        `${endpoint}/generate`,
        requestBody,
        { timeout: 600000 }, // 10 min timeout (LTX can be fast but allow for upscaling)
      );

      const { video_url, local_path, output_path } = response.data;
      return {
        videoUrl: video_url || output_path,
        localPath: local_path || output_path,
        duration,
        engine: "ltx-video",
      };
    } catch (error) {
      this.logger.error("LTX-Video generation failed", error);
      throw error;
    }
  }

  /**
   * Generate video using Luma AI (via API)
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
        },
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
    duration: number = 5,
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
        },
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

  /**
   * Generate video using Hugging Face Serverless Inference API (free tier).
   * Expects the model to return a JSON with a `video_url` field.
   */
  async generateWithHF(
    prompt: string,
    duration: number = 5,
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
        },
      );

      // The actual response format depends on the HF model's inference widget output
      if (response.data && response.data.video_url) {
        return {
          videoUrl: response.data.video_url,
          duration,
          engine: "hf",
        };
      } else {
        this.logger.warn("HF model did not return video_url");
        throw new Error("Hugging Face model did not return a video URL");
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
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("HF_VIDEO_ENDPOINT");
    if (!endpoint) {
      throw new Error("HF Video endpoint not configured");
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
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const endpoint = this.config.get<string>("HUNYUAN_ENDPOINT");
    if (!endpoint) {
      throw new Error("Hunyuan endpoint not configured");
    }

    throw new Error("Hunyuan engine not available as a direct service");
  }

  /**
   * Generate video using Google Veo (Gemini API)
   */
  async generateWithVeo(
    prompt: string,
    duration: number = 5,
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
        },
      );

      // Veo returns a long‑running operation
      const operationName = response.data.name;
      this.logger.log(`Veo operation started: ${operationName}`);

      // Polling for completion (simplified for this walkthrough)
      let videoUrl: string | undefined;
      for (let i = 0; i < 30; i++) {
        const statusResponse = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`,
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
    duration: number = 5,
  ): Promise<VideoGenerationResult> {
    const apiKey =
      this.config.get<string>("NVIDIA_API_KEY") ||
      this.config.get<string>("OPENROUTER_API_KEY");
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
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          video_settings: {
            num_frames: Math.min(Math.floor(duration * 24), 120), // Cosmos often caps at certain frames
            height: 704,
            width: 1280,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
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
            { headers: { Authorization: `Bearer ${apiKey}` } },
          );

          if (statusResponse.data.status === "succeeded") {
            return {
              videoUrl: statusResponse.data.video.url,
              duration,
              engine: "cosmos",
            };
          }
          if (statusResponse.data.status === "failed") {
            throw new Error(
              `Cosmos generation failed: ${statusResponse.data.error}`,
            );
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
        throw new Error("Cosmos generation timed out");
      }

      // Fallback: If it returns direct URL
      const videoUrl =
        response.data.video?.url ||
        response.data.video_url ||
        response.data.url ||
        response.data.assets?.[0]?.url;

      return {
        videoUrl,
        duration,
        engine: "cosmos",
      };
    } catch (error) {
      this.logger.error(
        "NVIDIA Cosmos generation failed",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Generate videos for all scenes in a script
   */
  public async generateFromScript(script: any): Promise<VideoGenerationResult> {
    if (script && script.scenes) {
      const prompts = script.scenes.map(
        (s: any) => s.visualPrompt || s.description,
      );
      return this.generateAndMergeScenes(prompts);
    }
    throw new Error("Invalid script format");
  }

  /**
   * Helper to merge audio into video using FFmpeg
   */
  public async mergeAudio(
    videoPath: string,
    audioPath: string,
  ): Promise<string> {
    const outputPath = videoPath.replace(".mp4", "_with_audio.mp4");
    this.logger.log(
      `Merging audio: ${videoPath} + ${audioPath} -> ${outputPath}`,
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
    durationPerScene: number = 5,
  ): Promise<VideoGenerationResult> {
    const results: string[] = [];
    const failedScenes: number[] = [];

    this.logger.log(`Generating ${prompts.length} cinematic scenes...`);

    for (let i = 0; i < prompts.length; i++) {
      try {
        this.logger.log(
          `Scene ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 50)}...`,
        );
        // Skip pre-generation scoring for script scenes (already evolved and scored)
        const result = await this.generateVideo(
          prompts[i],
          durationPerScene,
          undefined,
          true,
        );
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

    if (results.length === 0) {
      throw new Error("Failed to generate any scenes");
    }

    if (results.length === 1) {
      return {
        localPath: results[0],
        duration: durationPerScene,
        engine: "single_scene",
      };
    }

    // FFmpeg Merge Logic
    const finalOutputPath = path.join(
      process.cwd(),
      "uploads",
      "videos",
      `merged_${Date.now()}.mp4`,
    );

    this.logger.log(`Merging ${results.length} scenes into final video...`);

    return new Promise((resolve, reject) => {
      const mergedVideo = ffmpeg();
      results.forEach((p) => mergedVideo.input(p));

      mergedVideo
        .on("error", (err) => {
          this.logger.error("FFmpeg merge error", err);
          reject(err);
        })
        .on("end", () => {
          this.logger.log(`Cinematic merge complete: ${finalOutputPath}`);
          resolve({
            localPath: finalOutputPath,
            duration: results.length * durationPerScene,
            engine: "ffmpeg_merged",
          });
        })
        .mergeToFile(
          finalOutputPath,
          path.join(process.cwd(), "uploads", "videos", "temp"),
        );
    });
  }
}
