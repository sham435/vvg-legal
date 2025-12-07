import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { AiService } from '../ai/ai.service';

const streamPipeline = promisify(pipeline);

export interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  engine: string;
  localPath?: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generate video using Luma Dream Machine API
   */
  async generateWithLuma(prompt: string, duration: number = 5): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>('LUMA_API_KEY');
    if (!apiKey) {
      throw new Error('Luma API key not configured');
    }

    try {
      this.logger.log('Generating video with Luma Dream Machine...');

      // Create generation request
      const response = await axios.post(
        'https://api.lumalabs.ai/dream-machine/v1/generations',
        {
          prompt,
          aspect_ratio: '9:16', // Vertical for shorts
          loop: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const generationId = response.data.id;
      this.logger.log(`Luma generation started: ${generationId}`);

      // Poll for completion
      let videoUrl: string | null = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(
          `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
          {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          },
        );

        if (statusResponse.data.state === 'completed') {
          videoUrl = statusResponse.data.assets.video;
          this.logger.log('Luma video generation completed');
        } else if (statusResponse.data.state === 'failed') {
          throw new Error('Luma generation failed');
        }

        attempts++;
      }

      if (!videoUrl) {
        throw new Error('Luma generation timed out');
      }

      return {
        videoUrl,
        duration,
        engine: 'luma',
      };
    } catch (error) {
      this.logger.error('Luma generation failed', error);
      throw error;
    }
  }

  /**
   * Generate video using Runway Gen-3 (fallback)
   */
  async generateWithRunway(prompt: string, duration: number = 5): Promise<VideoGenerationResult> {
    const apiKey = this.config.get<string>('RUNWAY_API_KEY');
    if (!apiKey) {
      throw new Error('Runway API key not configured');
    }

    try {
      this.logger.log('Generating video with Runway Gen-3...');

      // Runway API implementation (similar pattern to Luma)
      // Note: Actual Runway API may differ - this is a template

      const response = await axios.post(
        'https://api.runwayml.com/v1/generate',
        {
          prompt,
          duration,
          resolution: '1080x1920', // 9:16 aspect ratio
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Poll for completion (implementation depends on Runway's API)
      const videoUrl = response.data.output_url;

      return {
        videoUrl,
        duration,
        engine: 'runway',
      };
    } catch (error) {
      this.logger.error('Runway generation failed', error);
      throw error;
    }
  }

  /**
   * Generate video using Stable Video Diffusion (Local)
   */
  async generateWithSVD(prompt: string, duration: number = 5): Promise<VideoGenerationResult> {
    const svdUrl = this.config.get<string>('SVD_API_URL');
    if (!svdUrl) {
      throw new Error('SVD API URL not configured');
    }

    try {
      this.logger.log('Generating video with SVD (requires image generation first)...');

      // 1. Generate Image from Text (DALL-E 3)
      const imageUrl = await this.aiService.generateImage(prompt);
      this.logger.log(`Base image generated: ${imageUrl}`);

      // 2. Call SVD API (FastAPI)
      this.logger.log('Calling SVD API...');
      const response = await axios.post(`${svdUrl}/generate`, {
        image_url: imageUrl,
        seed: 42,
        motion_bucket_id: 127
      });

      const { filename } = response.data;
      const finalVideoUrl = `${svdUrl}/outputs/${filename}`;

      this.logger.log(`SVD generation completed: ${finalVideoUrl}`);

      return {
        videoUrl: finalVideoUrl,
        duration: 4, 
        engine: 'svd',
      };

    } catch (error) {
      this.logger.error('SVD generation failed', error);
      throw error;
    }
  }

  /**
   * Generate video using CogVideoX
   */
  async generateWithCogVideoX(prompt: string, duration: number = 5): Promise<VideoGenerationResult> {
    // Use IMAGINE_TOKEN if set, otherwise fallback to COGVIDEON_API_KEY
    const token = this.config.get<string>('IMAGINE_TOKEN') || this.config.get<string>('COGVIDEON_API_KEY');
    if (!token) {
      throw new Error('CogVideoX token not configured');
    }

    // Endpoint for the local CogVideoX FastAPI server (default to localhost:7861)
    const endpoint = this.config.get<string>('COGVIDEON_ENDPOINT') || 'http://localhost:7861/generate';
    try {
      this.logger.log('Generating video with CogVideoX via FastAPI...');
      const response = await axios.post(
        endpoint,
        {
          prompt,
          duration,
          // Additional parameters can be added here if needed
        },
        {
          headers: {
            Authorization: token, // token may already include "Bearer " prefix
            'Content-Type': 'application/json',
          },
        },
      );

      // FastAPI returns { video_path, filename }
      const videoPath = response.data.video_path || response.data.videoUrl || response.data.video_url;
      // Construct a URL that can be accessed by the client. Assuming the FastAPI server serves static files under /outputs
      const baseUrl = endpoint.replace('/generate', '');
      const videoUrl = `${baseUrl}/outputs/${response.data.filename}`;

      return {
        videoUrl,
        duration,
        engine: 'cogvideox',
      };
    } catch (error) {
      this.logger.error('CogVideoX generation failed', error);
      throw error;
    }
  }

  /**
   * Generate video with automatic fallback
   */
  async generateVideo(prompt: string, duration: number = 5): Promise<VideoGenerationResult> {
    const engine = this.config.get<string>('VIDEO_ENGINE') || 'svd';
    if (engine === 'cogvideox') {
      // Use CogVideoX endpoint
      return await this.generateWithCogVideoX(prompt, duration);
    }
    // Default to SVD with fallback chain
    try {
      // Try SVD first (Free/Local)
      try {
        return await this.generateWithSVD(prompt, duration);
      } catch (svdError) {
        this.logger.warn('SVD failed, falling back to Luma', svdError);
        return await this.generateWithLuma(prompt, duration);
      }
    } catch (error) {
      this.logger.warn('Luma failed, trying Runway fallback');
      try {
        return await this.generateWithRunway(prompt, duration);
      } catch (fallbackError) {
        this.logger.error('All video generation engines failed');
        throw new Error('Video generation failed on all engines');
      }
    }
  }

  /**
   * Download video from URL to local storage
   */
  async downloadVideo(videoUrl: string, filename: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localPath = path.join(uploadDir, filename);

    try {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
      });

      await streamPipeline(response.data, fs.createWriteStream(localPath));
      
      this.logger.log(`Video downloaded to: ${localPath}`);
      return localPath;
    } catch (error) {
      this.logger.error('Failed to download video', error);
      throw error;
    }
  }

  /**
   * Generate video from script scenes
   */
  async generateFromScript(script: any): Promise<VideoGenerationResult[]> {
    const results: VideoGenerationResult[] = [];

    for (const scene of script.scenes) {
      try {
        const result = await this.generateVideo(scene.visualPrompt, scene.duration);
        results.push(result);
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed to generate scene ${scene.sceneNumber}`, error);
      }
    }

    return results;
  }
}
