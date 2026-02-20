import { Injectable, Logger } from "@nestjs/common";
import { AiService, VideoScript } from "../../modules/ai/ai.service";
import { EngagementPredictor } from "../intelligence/engagement-predictor";
import { ScriptMutator } from "./script-mutator";

@Injectable()
export class EvolutionEngine {
  private readonly logger = new Logger(EvolutionEngine.name);

  constructor(
    private readonly aiService: AiService,
    private readonly predictor: EngagementPredictor,
    private readonly mutator: ScriptMutator,
  ) {}

  /**
   * EVOLVE: Run a genetic algorithm to find the specific "Super Viral" script.
   *
   * @param topic Topic of the video
   * @param generations Number of generations to run
   * @param populationSize Size of the population per generation
   */
  async evolveScript(
    topic: string,
    generations: number = 3,
    populationSize: number = 4,
  ): Promise<VideoScript> {
    this.logger.log(`Starting Evolution Engine for topic: "${topic}"`);

    // 1. Initialization: Create Initial Population
    let population: VideoScript[] = [];
    this.logger.log("Genesis: Creating initial population...");

    // Generate base scripts with slight variations in prompt
    for (let i = 0; i < populationSize; i++) {
      const variation =
        i === 0 ? "Standard" : i % 2 === 0 ? "Controversial" : "Emotional";
      const script = await this.aiService.generateScript(
        topic,
        `Style: ${variation}`,
      );
      population.push(script);
    }

    // Evolution Loop
    for (let gen = 1; gen <= generations; gen++) {
      this.logger.log(`\n=== Generation ${gen} ===`);

      // 2. Evaluation: Calculate Fitness (Viral Score)
      const scoredPopulation = await Promise.all(
        population.map(async (script) => {
          const text = `${script.hook} ${script.scenes.map((s) => s.description).join(" ")}`;
          const score = await this.predictor.predictViralScore(text, topic);
          return { script, score: score.totalScore };
        }),
      );

      // Sort by fitness (highest score first)
      scoredPopulation.sort((a, b) => b.score - a.score);

      const bestOfGen = scoredPopulation[0];
      this.logger.log(
        `Best of Generation ${gen}: "${bestOfGen.script.title}" (Score: ${bestOfGen.score})`,
      );

      // Termination Check (if we hit a very high score)
      if (bestOfGen.score >= 95) {
        this.logger.log("Evolution Target Met (95+). Stopping early.");
        return bestOfGen.script;
      }

      if (gen === generations) {
        return bestOfGen.script;
      }

      // 3. Selection: Keep top 50% as parents
      const parents = scoredPopulation
        .slice(0, Math.floor(populationSize / 2))
        .map((s) => s.script);

      // 4. Reproduction: Create Next Generation
      const nextGen: VideoScript[] = [...parents]; // Elitism: Keep parents

      while (nextGen.length < populationSize) {
        if (Math.random() > 0.4 && parents.length >= 2) {
          // Crossover
          const parentA = parents[Math.floor(Math.random() * parents.length)];
          const parentB = parents[Math.floor(Math.random() * parents.length)];
          const child = await this.mutator.crossoverScripts(parentA, parentB);
          nextGen.push(child);
        } else {
          // Mutation
          const parent = parents[Math.floor(Math.random() * parents.length)];
          const mutant = await this.mutator.mutateScript(parent);
          nextGen.push(mutant);
        }
      }

      population = nextGen;
    }

    return population[0]; // Fallback
  }
}
