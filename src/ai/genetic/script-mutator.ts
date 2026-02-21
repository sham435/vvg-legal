import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { IntelligentRouter } from "../../ai/orchestrator/intelligent-router";
import { VideoScript, ScriptScene } from "../../modules/ai/ai.service";

@Injectable()
export class ScriptMutator {
  private readonly logger = new Logger(ScriptMutator.name);
  private openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly router: IntelligentRouter,
  ) {
    const apiKey = this.config.get<string>("OPENROUTER_API_KEY");
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
   * MUTATION: Aggressively modify a script to increase viral potential.
   * Strategies:
   * 1. Hook Intensification (Make it shorter/punchier)
   * 2. Pacing Acceleration (Reduce duration, cut fluff)
   * 3. Emotional Amplification (Add controversy/shock/awe)
   */
  async mutateScript(
    script: VideoScript,
    mutationRate: number = 0.3,
  ): Promise<VideoScript> {
    if (!this.openai) throw new Error("OpenAI/OpenRouter key missing");

    const strategies = [
      "Make the hook more shocking or controversial.",
      "Cut the total duration by 15% by removing filler words.",
      "Change the visual style to be more 'chaos edits' or 'brainrot' (fast cuts).",
      "Add a plot twist in the middle.",
      "Rewrite the narration to be more Gen-Z/Slang heavy.",
    ];

    // Select a random strategy
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    this.logger.log(`Mutating script with strategy: ${strategy}`);

    const prompt = `You are a TikTok Algorithm Hacker. 
MUTATE this script to make it 10x more viral.
Current Script: ${JSON.stringify(script)}

Mutation Strategy: ${strategy}

Rules:
- Keep the same topic.
- Return VALID JSON only.
- Minimize structure changes, strictly apply the strategy.

Output JSON: { "title": "...", "hook": "...", "scenes": [...], "totalDuration": ..., "hashtags": [...] }`;

    try {
      // Use Gemma 3 12B or 4B for fast mutation
      const provider = this.router.selectProvider({
        prompt,
        contentType: "script",
        constraints: { minQuality: "medium" },
      });

      const completion = await this.openai.chat.completions.create({
        model: provider.name,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9, // High temperature for creativity/mutation
      });

      const content = completion.choices[0].message.content || "{}";
      const cleanContent = content.replace(/```json\n?|\n?```/g, "");
      const mutated = JSON.parse(cleanContent);

      return { ...script, ...mutated }; // Merge to ensure type safety
    } catch (error) {
      this.logger.warn("Mutation failed, returning original script", error);
      return script;
    }
  }

  /**
   * CROSSOVER: Combine two parent scripts to create a child script.
   * Logic: Take the best Hook from one, and the best Scenes from the other.
   */
  async crossoverScripts(
    parentA: VideoScript,
    parentB: VideoScript,
  ): Promise<VideoScript> {
    // 50/50 chance to swap hooks
    const childHook = Math.random() > 0.5 ? parentA.hook : parentB.hook;
    const childTitle = Math.random() > 0.5 ? parentA.title : parentB.title;

    // Interleave scenes (simple crossover)
    const childScenes: ScriptScene[] = [];
    const minScenes = Math.min(parentA.scenes.length, parentB.scenes.length);

    for (let i = 0; i < minScenes; i++) {
      // Take even scenes from A, odd from B
      if (i % 2 === 0) {
        childScenes.push(parentA.scenes[i]);
      } else {
        childScenes.push(parentB.scenes[i]);
      }
    }

    // Recalculate duration
    const duration = childScenes.reduce((sum, s) => sum + s.duration, 0);

    return {
      title: childTitle,
      hook: childHook,
      scenes: childScenes,
      totalDuration: duration,
      hashtags: [...new Set([...parentA.hashtags, ...parentB.hashtags])].slice(
        0,
        5,
      ),
    };
  }
}
