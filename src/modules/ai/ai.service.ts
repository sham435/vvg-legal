import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { IntelligentRouter } from "../../ai/orchestrator/intelligent-router";
import { CostOptimizer } from "../../ai/orchestrator/cost-optimizer";
import {
  EngagementPredictor,
  ViralScore,
} from "../../ai/intelligence/engagement-predictor";

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
    scene: this.config.get<string>(
      "AI_MODEL_SCENE",
      "google/gemini-2.0-pro-exp-02-05:free",
    ),
    moral: this.config.get<string>(
      "AI_MODEL_MORAL",
      "anthropic/claude-3.5-opus",
    ),
    narration: this.config.get<string>(
      "AI_MODEL_NARRATION",
      "openai/gpt-oss-120b-medium",
    ),
  };

  constructor(
    private readonly config: ConfigService,
    private readonly router: IntelligentRouter,
    private readonly costOptimizer: CostOptimizer,
    private readonly predictor: EngagementPredictor,
  ) {
    const openrouterKey = this.config.get<string>("OPENROUTER_API_KEY");
    const openaiKey = this.config.get<string>("OPENAI_API_KEY");

    const apiKey = openrouterKey || openaiKey;
    const isOpenRouter = !!openrouterKey;

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: isOpenRouter
          ? "https://openrouter.ai/api/v1"
          : "https://api.openai.com/v1",
        defaultHeaders: isOpenRouter
          ? {
              "HTTP-Referer": "https://vvg.local",
              "X-Title": "Viral Video Generator",
            }
          : undefined,
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

    const prompt = `You are a viral content creator specializing in short-form video content... (prompt truncated for brevity in change)`;

    // Construct full prompt here same as before...
    const fullPrompt = `You are a viral content creator specializing in short-form video content for YouTube Shorts, TikTok, and Instagram Reels.

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
      // Use Intelligent Router to select best "script" provider
      // Constraint: Free tier (Cost 0) implied by router config
      const provider = this.router.selectProvider({
        prompt: fullPrompt,
        contentType: "script",
        constraints: { minQuality: "high" },
      });

      const model = provider.name;
      this.logger.log(`Generating script using optimized provider: ${model}`);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // ... loop logic similar to before but using selected model ...
        try {
          const completion = await this.openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are an expert viral content creator. Always respond with valid JSON only.",
              },
              { role: "user", content: fullPrompt },
            ],
            temperature: 0.8,
          });

          // ... parsing logic same as before ...
          const content = completion.choices[0].message.content;
          // Simple JSON cleanup if needed
          const cleanContent = content.replace(/```json\n?|\n?```/g, "");
          const scriptData = JSON.parse(cleanContent);

          this.logger.log(`Generated script: ${scriptData.title}`);
          return scriptData;
        } catch (error) {
          // ... error handling logic ...
          // reusing existing catch block logic mostly
          const errMsg = (error as any).message || "";
          if (errMsg.includes("429")) {
            this.logger.error(`AI Quota/Rate Limit hit (429): ${errMsg}`);
            return this.getArticleModeFallback(topic);
          }
          this.logger.error(`Failed to generate script with ${model}`, error);
          if (attempt === maxAttempts) break;
          await new Promise((res) => setTimeout(res, attempt * 2000));
        }
      }
      return this.getArticleModeFallback(topic);
    } catch (error) {
      this.logger.error("Failed to generate script", error);
      return this.getArticleModeFallback(topic);
    }
  }

  /**
   * Generate a script that is auto-optimized for viral potential
   */
  async generateOptimizedScript(
    topic: string,
    targetScore: number = 80,
  ): Promise<VideoScript> {
    this.logger.log(
      `Starting auto-optimization for topic: ${topic} (Target Score: ${targetScore})`,
    );

    // 1. Initial Generation
    let currentScript = await this.generateScript(topic);
    let attempts = 0;
    const maxOptimizationAttempts = 3;

    while (attempts < maxOptimizationAttempts) {
      // 2. Score the script
      const scriptText = currentScript.scenes
        .map((s) => `${s.description} ${s.narration}`)
        .join("\n");
      const score = await this.analyzeScriptPotential(scriptText, topic);

      this.logger.log(
        `Optimization Attempt ${attempts + 1}: Score ${score.totalScore}/100`,
      );

      if (score.totalScore >= targetScore) {
        this.logger.log("Target score reached!");
        return currentScript;
      }

      // 3. Regenerate with feedback
      this.logger.log(
        `Score too low. Feedback: ${score.suggestions.join(", ")}`,
      );

      const feedbackContext = `Previous script scored ${score.totalScore}/100. 
      CRITICAL FEEDBACK TO IMPROVE VIRALITY: 
      ${score.suggestions.map((s) => `- ${s}`).join("\n")}
      
      FOCUS: Make the hook faster, the pacing tighter, and the emotion stronger.`;

      // Use the feedback description to guide the next generation
      currentScript = await this.generateScript(
        topic,
        `Refine this concept based on feedback: ${feedbackContext}`,
      );

      attempts++;
    }

    this.logger.warn(
      `Max optimization attempts reached. Best effort script returned.`,
    );
    return currentScript;
  }

  /**
   * Helper for "Article Mode" fallback (local template)
   */
  private getArticleModeFallback(topic: string): VideoScript {
    this.logger.warn(`Enforcing Article Mode fallback for topic: ${topic}`);
    return {
      title: `The Truth About ${topic}`,
      hook: "You won't believe what we discovered about this!",
      scenes: [
        {
          sceneNumber: 1,
          duration: 10,
          description: "A professional documentary style introduction",
          visualPrompt: `Professional cinematic close-up relating to ${topic}, high quality, 4k`,
          narration: `Today we are diving deep into the world of ${topic}.`,
        },
        {
          sceneNumber: 2,
          duration: 10,
          description: "Detailed informational scene",
          visualPrompt: `Documentary footage showing key aspects of ${topic}, hyper-realistic`,
          narration:
            "New findings suggest that this could change everything we know.",
        },
      ],
      totalDuration: 20,
      hashtags: ["#articlemode", "#news", "#depth"],
    };
  }

  /**
   * Internal helper to call a specific AI model
   */
  private async callAiModel(
    model: string,
    prompt: string,
    systemPrompt?: string,
  ): Promise<any> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                systemPrompt ||
                "You are an expert viral content creator. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
        });

        const content = completion.choices[0].message.content;
        try {
          return JSON.parse(content);
        } catch (e) {
          this.logger.warn(
            `Model ${model} did not return valid JSON: ${content.substring(0, 100)}...`,
          );
          if (attempt === maxAttempts)
            throw new Error(
              `Model ${model} failed to return valid JSON after ${maxAttempts} attempts`,
            );
          continue;
        }
      } catch (error) {
        const errMsg = (error as any).message || "";
        if (errMsg.includes("429") && attempt < maxAttempts) {
          const delay = attempt * 2000;
          this.logger.warn(
            `AI rate limit hit (${model}), retry ${attempt}/${maxAttempts} after ${delay}ms`,
          );
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
  async generateCinematicScript(
    topic: string,
    description?: string,
  ): Promise<VideoScript> {
    if (!this.openai) throw new Error("OpenAI API key not configured");

    this.logger.log(`Starting cinematic generation for: ${topic}`);

    try {
      // 1. Scene Creation (Gemini 3 Pro High) with Viral Optimization Loop
      let scriptBase: any;
      let attempts = 0;
      const maxAttempts = 3;
      const targetScore = 80;
      let feedback = "";

      while (attempts < maxAttempts) {
        this.logger.log(
          `Cinematic Scene Generation Attempt ${attempts + 1} (Feedback: ${feedback ? "Yes" : "None"})`,
        );

        const scenePrompt = `Create a viral video structure for: ${topic}. 
Focus on: Ultra-realistic cinematic scenes, 4-5 scenes total.
${feedback ? `\nCRITICAL FEEDBACK FOR VIRALITY: ${feedback}\n` : ""}
Return JSON: { "title": "...", "hook": "...", "scenes": [{ "sceneNumber": 1, "duration": 8, "description": "...", "visualPrompt": "Detailed visual for AI generation", "narration": "TEMP_PLACEHOLDER" }], "hashtags": [] }`;

        scriptBase = await this.callAiModel(this.modelMap.scene, scenePrompt);

        // Analyze Viral Potential of the Structure
        const scriptPreview = `${scriptBase.hook}\n${scriptBase.scenes.map((s: any) => s.description).join("\n")}`;
        const assessment = await this.analyzeScriptPotential(
          scriptPreview,
          topic,
        );

        this.logger.log(`Structure Viral Score: ${assessment.totalScore}/100`);

        if (assessment.totalScore >= targetScore) {
          this.logger.log("Viral Target Reached!");
          break;
        }

        feedback =
          assessment.suggestions.join(". ") +
          ". Make the hook stronger and scenes more visually arresting.";
        attempts++;

        if (attempts === maxAttempts) {
          this.logger.warn(
            "Max optimization attempts reached. Proceeding with best effort.",
          );
        }
      }

      // 2. Strong Message / Moral Closing (Claude Opus 4.5)
      const moralPrompt = `Provide a strong, moral-closing "reunion" style scene for this video topic: "${topic}". 
Describe the visual and the deep emotional message. 
Return JSON: { "description": "...", "visualPrompt": "...", "narration": "...", "moralMessage": "..." }`;

      const moralScene = await this.callAiModel(
        this.modelMap.moral,
        moralPrompt,
      );

      // 3. Exact Narration Script (GPT-OSS 120B Medium)
      const narrationPrompt = `For each scene below, write the EXACT voiceover lines. 
The lines must sync perfectly with the visual descriptions. 
Include the moral closing as the final line.
Scenes: ${JSON.stringify([...scriptBase.scenes, moralScene])}
Return JSON: { "voiceovers": ["Line for scene 1", "Line for scene 2", ...] }`;

      const narrationResult = await this.callAiModel(
        this.modelMap.narration,
        narrationPrompt,
      );

      // Assemble final script
      const scenes = scriptBase.scenes.map((s: any, i: number) => ({
        ...s,
        narration:
          narrationResult.voiceovers?.[i] || "Visual: " + s.description,
      }));

      // Add moral closing
      scenes.push({
        sceneNumber: scenes.length + 1,
        duration: 10,
        description: moralScene.description,
        visualPrompt: moralScene.visualPrompt,
        narration:
          narrationResult.voiceovers?.[scenes.length] || moralScene.narration,
      });

      const finalScript = {
        title: scriptBase.title,
        hook: scriptBase.hook,
        scenes,
        totalDuration: scenes.reduce(
          (sum: number, s: any) => sum + s.duration,
          0,
        ),
        hashtags: scriptBase.hashtags,
      };

      this.logger.log(`Cinematic script generated: ${finalScript.title}`);
      return finalScript;
    } catch (error) {
      this.logger.error(
        "Cinematic generation failed, falling back to basic",
        error,
      );
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
      const provider = this.router.selectProvider({
        prompt,
        contentType: "script", // Use script capabilities for text generation
        constraints: { minQuality: "medium" },
      });

      const completion = await this.openai.chat.completions.create({
        model: provider.name,
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
      const provider = this.router.selectProvider({
        prompt,
        contentType: "script",
        constraints: { minQuality: "medium" },
      });

      const completion = await this.openai.chat.completions.create({
        model: provider.name,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      let refined = completion.choices[0].message.content?.trim();

      if (refined) {
        refined = refined.replace(/^Refined Prompt: /i, "");
        refined = refined.replace(/^"|"$/g, "");
      }

      this.logger.log(
        `Refined using ${provider.name}: "${simplePrompt}" -> "${refined}"`,
      );
      return refined || simplePrompt;
    } catch (error) {
      this.logger.warn("Failed to refine video prompt", error);
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
      const isOpenRouter = !!this.config.get<string>("OPENROUTER_API_KEY");
      const model = isOpenRouter
        ? this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free")
        : "gpt-4o-mini";

      const completion = await this.openai.chat.completions.create({
        model,
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

      // CHECK: Cost Constraint
      // DALL-E 3 is approx $0.04 - $0.08 per image.
      const estimatedCost = 0.04;
      if (!this.costOptimizer.canAfford(estimatedCost)) {
        this.logger.warn(
          `Skipping DALL-E 3 generation due to budget constraint ($${estimatedCost}). Using fallback.`,
        );
        throw new Error("Budget constraint exceeded for image generation");
      }

      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1792", // Vertical aspect ratio for shorts (approx) if supported, else 1024x1024
        // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
      });

      const imageUrl = response.data[0].url;
      this.costOptimizer.recordSpend(estimatedCost);
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
    const isOpenRouter = !!this.config.get<string>("OPENROUTER_API_KEY");
    const model = isOpenRouter
      ? this.config.get<string>("AI_MODEL", "nvidia/nemotron-nano-9b-v2:free")
      : "gpt-4o-mini";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
        });
        return { success: true };
      } catch (error) {
        const errMsg = (error as any).message || "";
        if (errMsg.includes("429") && attempt < maxAttempts) {
          const delay = attempt * 1500;
          this.logger.warn(
            `AI connectivity check rate limit, retry ${attempt}/${maxAttempts} after ${delay}ms`,
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        if (errMsg.includes("429")) {
          this.logger.warn(
            "AI connectivity check rate limited, assuming service is reachable",
          );
          return { success: true };
        }
        return { success: false, error: errMsg };
      }
    }
    return { success: false, error: "Unknown connectivity issue" };
  }

  /**
   * Analyze script for viral potential
   */
  async analyzeScriptPotential(
    scriptText: string,
    topic: string,
  ): Promise<ViralScore> {
    return this.predictor.predictViralScore(scriptText, topic);
  }
}
