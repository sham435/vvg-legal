import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

export interface ScriptScene {
  sceneNumber: number;
  duration: number; // seconds
  description: string;
  visualPrompt: string;
  narration: string;
}

export interface VideoScript {
  title: string;
  hook: string;
  scenes: ScriptScene[];
  totalDuration: number;
  hashtags: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  // Multi-model mapping for cinematic scripts
  private modelMap = {
    scene: this.config.get<string>("AI_MODEL_SCENE", "google/gemini-2.0-pro-exp-02-05:free"), 
    moral: this.config.get<string>("AI_MODEL_MORAL", "anthropic/claude-3.5-opus"),
    narration: this.config.get<string>("AI_MODEL_NARRATION", "openai/gpt-oss-120b-medium"),
  };

  constructor(private readonly config: ConfigService) {
    // Use OpenRouter API with Nemotron Nano model
    const apiKey = this.config.get<string>("OPENROUTER_API_KEY") || this.config.get<string>("OPENAI_API_KEY");
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://vvg.local",
          "X-Title": "Viral Video Generator",
        },
      });
    }
  }

  /**
   * Generate viral video script from topic
   */
  async generateScript(
    topic: string,
    description?: string,
  ): Promise<VideoScript> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `You are a viral content creator specializing in short-form video content for YouTube Shorts, TikTok, and Instagram Reels.

Create a compelling 45-60 second video script about:
Topic: ${topic}
${description ? `Description: ${description}` : ""}

Requirements:
- Dramatic, fast-paced cartoon/animation style
- Strong hook in first 3 seconds
- 4-6 scenes with visual descriptions
- Engaging narration for each scene
- Viral hashtags

Format your response as JSON:
{
  "title": "Catchy video title (max 60 chars)",
  "hook": "Opening hook line",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 8,
      "description": "What happens in this scene",
      "visualPrompt": "Detailed visual description for AI video generation",
      "narration": "Voice-over text"
    }
  ],
  "totalDuration": 50,
  "hashtags": ["hashtag1", "hashtag2"]
}`;

    try {
      // Retry logic for rate limiting (429)
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const completion = await this.openai.chat.completions.create({
            model: this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free"),
            messages: [
              {
                role: "system",
                content:
                  "You are an expert viral content creator. Always respond with valid JSON only.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.8,
          });

          const scriptData = JSON.parse(completion.choices[0].message.content);
          this.logger.log(`Generated script: ${scriptData.title}`);
          return scriptData;
        } catch (error) {
          const errMsg = (error as any).message || '';
          if (errMsg.includes('429') && attempt < maxAttempts) {
            const delay = attempt * 2000; // simple backoff
            this.logger.warn(`AI rate limit hit, retry ${attempt}/${maxAttempts} after ${delay}ms`);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
          // If not rate limit or max attempts reached, fall back
          this.logger.error("Failed to generate script (OpenAI)", error);
          break;
        }
      }

      // FALLBACK: Return generic script to keep pipeline alive
      this.logger.warn("Using FALLBACK script due to AI failure");
      return {
        title: `Viral Video: ${topic}`,
        hook: "You won't believe what happened!",
        scenes: [
          {
            sceneNumber: 1,
            duration: 5,
            description: "Intro scene showing the topic",
            visualPrompt: `A high quality photo of ${topic}`,
            narration: "Here is something amazing about " + topic,
          },
          {
            sceneNumber: 2,
            duration: 5,
            description: "Exciting detail",
            visualPrompt: `A dramatic close up of ${topic}`,
            narration: "Did you know this fact?",
          },
        ],
        totalDuration: 10,
        hashtags: ["#viral", "#shorts", "#fyp"],
      };
    } catch (error) {
      this.logger.error("Failed to generate script (OpenAI)", error);
      
      // FALLBACK: Return generic script to keep pipeline alive
      this.logger.warn("Using FALLBACK script due to API failure");
      return {
        title: `Viral Video: ${topic}`,
        hook: "You won't believe what happened!",
        scenes: [
          {
            sceneNumber: 1,
            duration: 5,
            description: "Intro scene showing the topic",
            visualPrompt: `A high quality photo of ${topic}`,
            narration: "Here is something amazing about " + topic
          },
          {
            sceneNumber: 2,
            duration: 5,
            description: "Exciting detail",
            visualPrompt: `A dramatic close up of ${topic}`,
            narration: "Did you know this fact?"
          }
        ],
        totalDuration: 10,
        hashtags: ["#viral", "#shorts", "#fyp"]
      };
    }
  }

  /**
   * Internal helper to call a specific AI model
   */
  private async callAiModel(model: string, prompt: string, systemPrompt?: string): Promise<any> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt || "You are an expert viral content creator. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
        });

        const content = completion.choices[0].message.content;
        try {
          return JSON.parse(content);
        } catch (e) {
          this.logger.warn(`Model ${model} did not return valid JSON: ${content.substring(0, 100)}...`);
          if (attempt === maxAttempts) throw new Error(`Model ${model} failed to return valid JSON after ${maxAttempts} attempts`);
          continue;
        }
      } catch (error) {
        const errMsg = (error as any).message || '';
        if (errMsg.includes('429') && attempt < maxAttempts) {
          const delay = attempt * 2000;
          this.logger.warn(`AI rate limit hit (${model}), retry ${attempt}/${maxAttempts} after ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Orchestrate multi-model generation for a cinematic script
   */
  async generateCinematicScript(topic: string, description?: string): Promise<VideoScript> {
    if (!this.openai) throw new Error("OpenAI API key not configured");

    this.logger.log(`Starting cinematic generation for: ${topic}`);

    try {
      // 1. Scene Creation (Gemini 3 Pro High)
      const scenePrompt = `Create a viral video structure for: ${topic}. 
Focus on: Ultra-realistic cinematic scenes, 4-5 scenes total.
Return JSON: { "title": "...", "hook": "...", "scenes": [{ "sceneNumber": 1, "duration": 8, "description": "...", "visualPrompt": "Detailed visual for AI generation", "narration": "TEMP_PLACEHOLDER" }], "hashtags": [] }`;
      
      const scriptBase = await this.callAiModel(this.modelMap.scene, scenePrompt);
      
      // 2. Strong Message / Moral Closing (Claude Opus 4.5)
      const moralPrompt = `Provide a strong, moral-closing "reunion" style scene for this video topic: "${topic}". 
Describe the visual and the deep emotional message. 
Return JSON: { "description": "...", "visualPrompt": "...", "narration": "...", "moralMessage": "..." }`;
      
      const moralScene = await this.callAiModel(this.modelMap.moral, moralPrompt);

      // 3. Exact Narration Script (GPT-OSS 120B Medium)
      const narrationPrompt = `For each scene below, write the EXACT voiceover lines. 
The lines must sync perfectly with the visual descriptions. 
Include the moral closing as the final line.
Scenes: ${JSON.stringify([...scriptBase.scenes, moralScene])}
Return JSON: { "voiceovers": ["Line for scene 1", "Line for scene 2", ...] }`;

      const narrationResult = await this.callAiModel(this.modelMap.narration, narrationPrompt);

      // Assemble final script
      const scenes = scriptBase.scenes.map((s: any, i: number) => ({
        ...s,
        narration: narrationResult.voiceovers?.[i] || "Visual: " + s.description,
      }));

      // Add moral closing
      scenes.push({
        sceneNumber: scenes.length + 1,
        duration: 10,
        description: moralScene.description,
        visualPrompt: moralScene.visualPrompt,
        narration: narrationResult.voiceovers?.[scenes.length] || moralScene.narration,
      });

      const finalScript = {
        title: scriptBase.title,
        hook: scriptBase.hook,
        scenes,
        totalDuration: scenes.reduce((sum: number, s: any) => sum + s.duration, 0),
        hashtags: scriptBase.hashtags,
      };

      this.logger.log(`Cinematic script generated: ${finalScript.title}`);
      return finalScript;

    } catch (error) {
      this.logger.error("Cinematic generation failed, falling back to basic", error);
      return this.generateScript(topic, description);
    }
  }

  /**
   * Generate thumbnail prompt from script
   */
  async generateThumbnailPrompt(script: VideoScript): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Create a thumbnail image prompt for this video:
Title: ${script.title}
Hook: ${script.hook}

Generate a detailed prompt for creating an eye-catching YouTube/TikTok thumbnail. Should be dramatic, colorful, and clickable.
Keep it under 200 characters.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free"),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error("Failed to generate thumbnail prompt", error);
      throw error;
    }
  }

  /**
   * Refine a simple video prompt into a detailed cinematic prompt
   */
  async refineVideoPrompt(simplePrompt: string): Promise<string> {
    if (!this.openai) {
      return simplePrompt;
    }

    const prompt = `Convert this simple video generation prompt into a detailed, cinematic "Director's Prompt" for a video generation AI.
Original Prompt: "${simplePrompt}"

Requirements:
- Add specific visual details (lighting, camera angle, textures, mood).
- Use high-quality keywords (cinematic, 4k, hyper-realistic).
- Output ONLY the refined prompt, no extra text, no reasoning.

REFINED PROMPT:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free"),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      let refined = completion.choices[0].message.content?.trim();
      
      // Clean up potential unwanted preambles
      if (refined) {
        refined = refined.replace(/^Refined Prompt: /i, '');
        refined = refined.replace(/^"|"$/g, '');
      }

      if (!refined) {
        this.logger.warn(`OpenRouter returned empty content. Full response: ${JSON.stringify(completion)}`);
      }
      this.logger.log(`Refined prompt from "${simplePrompt}" to "${refined}"`);
      return refined || simplePrompt;
    } catch (error) {
      this.logger.warn("Failed to refine video prompt (OpenRouter)", error);
      return simplePrompt;
    }
  }

  /**
   * Optimize title for platform
   */
  async optimizeTitle(
    originalTitle: string,
    platform: "youtube" | "tiktok" | "instagram",
  ): Promise<string> {
    if (!this.openai) {
      return originalTitle;
    }

    const platformGuidelines = {
      youtube: "max 100 chars, front-load keywords, add numbers or questions",
      tiktok: "max 100 chars, casual tone, use emojis",
      instagram: "max 125 chars, engaging, use relevant emojis",
    };

    const prompt = `Optimize this video title for ${platform}:
"${originalTitle}"

Guidelines: ${platformGuidelines[platform]}

Return only the optimized title, nothing else.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free"),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error("Failed to optimize title", error);
      return originalTitle;
    }
  }
  /**
   * Generate image from prompt using DALL-E 3
   */
  async generateImage(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      this.logger.log(`Generating image for prompt: ${prompt}`);
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1792", // Vertical aspect ratio for shorts (approx) if supported, else 1024x1024
        // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
      });

      const imageUrl = response.data[0].url;
      this.logger.log("Image generated successfully");
      return imageUrl;
    } catch (error) {
      // FALLBACK: Use a high-quality placeholder service
      const fallbackUrl = `https://placehold.co/1024x1792/png?text=${encodeURIComponent(prompt.substring(0, 30))}`;
      this.logger.log(`Using FALLBACK image: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Diagnostic check to verify AI connectivity (NVIDIA or OpenRouter).
   */
  async checkConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.openai) {
      return { success: false, error: "OpenAI client not initialized" };
    }

    // Retry on rate limit for connectivity check
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.openai.chat.completions.create({
          model: this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free"),
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
        });
        return { success: true };
      } catch (error) {
        const errMsg = (error as any).message || '';
        if (errMsg.includes('429') && attempt < maxAttempts) {
          const delay = attempt * 1500;
          this.logger.warn(`AI connectivity check rate limit, retry ${attempt}/${maxAttempts} after ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        if (errMsg.includes('429')) {
          this.logger.warn('AI connectivity check rate limited, assuming service is reachable');
          return { success: true };
        }
        return { success: false, error: errMsg };
      }
    }
    return { success: false, error: 'Unknown connectivity issue' };
  }
}
