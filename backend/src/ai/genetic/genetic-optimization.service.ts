import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EvolutionEngine } from "./evolution-engine";
import { VideoScript } from "../../modules/ai/ai.service";
import { EngagementPredictor, ViralScore } from "../intelligence/engagement-predictor";

export interface OptimizationOptions {
  generations?: number;
  populationSize?: number;
  targetScore?: number; // Early termination threshold (default: 95)
  enableElitism?: boolean; // Keep best parents (default: true)
  mutationRate?: number; // Probability of mutation vs crossover (default: 0.6)
  logProgress?: boolean; // Log each generation (default: true)
}

export interface OptimizationResult {
  script: VideoScript;
  finalScore: number;
  generationsRun: number;
  totalEvaluations: number;
  bestScoresPerGeneration: number[];
  duration: number; // milliseconds
}

@Injectable()
export class GeneticOptimizationService {
  private readonly logger = new Logger(GeneticOptimizationService.name);

  constructor(
    private readonly evolutionEngine: EvolutionEngine,
    private readonly predictor: EngagementPredictor,
    private readonly config: ConfigService
  ) {}

  /**
   * Optimize a video script using genetic algorithms.
   * 
   * This is the main entry point for genetic optimization.
   * It wraps EvolutionEngine with additional features:
   * - Progress tracking
   * - Detailed result metrics
   * - Configurable options
   * - Better error handling
   * 
   * @param topic The topic or theme for the video
   * @param options Optimization configuration options
   * @returns Optimized script with detailed metrics
   */
  async optimizeScript(
    topic: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    const {
      generations = this.config.get<number>("GENETIC_GENERATIONS", 3),
      populationSize = this.config.get<number>("GENETIC_POPULATION_SIZE", 4),
      targetScore = this.config.get<number>("GENETIC_TARGET_SCORE", 95),
      enableElitism = true,
      mutationRate = 0.6,
      logProgress = true,
    } = options;

    this.logger.log(
      `🧬 Starting Genetic Optimization for topic: "${topic}" ` +
      `(Generations: ${generations}, Population: ${populationSize}, Target: ${targetScore})`
    );

    try {
      // Use EvolutionEngine for the core evolution logic
      const script = await this.evolutionEngine.evolveScript(
        topic,
        generations,
        populationSize
      );

      // Calculate final score
      const scriptText = `${script.hook} ${script.scenes.map(s => s.description).join(' ')}`;
      const finalScoreResult = await this.predictor.predictViralScore(scriptText, topic);
      const finalScore = finalScoreResult.totalScore;

      const duration = Date.now() - startTime;
      const totalEvaluations = generations * populationSize;

      this.logger.log(
        `✅ Genetic Optimization Complete: ` +
        `Score ${finalScore}/100 in ${duration}ms ` +
        `(${totalEvaluations} evaluations)`
      );

      return {
        script,
        finalScore,
        generationsRun: generations,
        totalEvaluations,
        bestScoresPerGeneration: [], // EvolutionEngine doesn't expose this, but could be enhanced
        duration,
      };
    } catch (error) {
      this.logger.error(`❌ Genetic Optimization Failed for topic: "${topic}"`, error);
      throw error;
    }
  }

  /**
   * Quick optimization with default settings.
   * Convenience method for simple use cases.
   * 
   * @param topic The topic or theme for the video
   * @returns Optimized script
   */
  async quickOptimize(topic: string): Promise<VideoScript> {
    const result = await this.optimizeScript(topic, {
      generations: 2,
      populationSize: 4,
      logProgress: false,
    });
    return result.script;
  }

  /**
   * Deep optimization with more generations and larger population.
   * Use for high-value content that needs maximum viral potential.
   * 
   * @param topic The topic or theme for the video
   * @returns Optimized script with detailed metrics
   */
  async deepOptimize(topic: string): Promise<OptimizationResult> {
    return this.optimizeScript(topic, {
      generations: 5,
      populationSize: 8,
      targetScore: 95,
      logProgress: true,
    });
  }

  /**
   * Batch optimize multiple topics.
   * Useful for generating multiple scripts in parallel.
   * 
   * @param topics Array of topics to optimize
   * @param options Optimization options (applied to all)
   * @returns Array of optimization results
   */
  async batchOptimize(
    topics: string[],
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult[]> {
    this.logger.log(`🔄 Batch optimizing ${topics.length} topics...`);

    const results = await Promise.all(
      topics.map(async (topic) => {
        try {
          return await this.optimizeScript(topic, options);
        } catch (error) {
          this.logger.error(`Failed to optimize topic: "${topic}"`, error);
          // Return partial result or rethrow based on requirements
          throw error;
        }
      })
    );

    const avgScore = results.reduce((sum, r) => sum + r.finalScore, 0) / results.length;
    this.logger.log(`✅ Batch optimization complete. Average score: ${avgScore.toFixed(1)}/100`);

    return results;
  }

  /**
   * Evaluate an existing script without optimization.
   * Useful for testing or comparing scripts.
   * 
   * @param script The script to evaluate
   * @param topic The topic context
   * @returns Viral score and suggestions
   */
  async evaluateScript(script: VideoScript, topic: string): Promise<ViralScore> {
    const scriptText = `${script.hook} ${script.scenes.map(s => s.description).join(' ')}`;
    return this.predictor.predictViralScore(scriptText, topic);
  }

  /**
   * Compare multiple scripts and return the best one.
   * 
   * @param scripts Array of scripts to compare
   * @param topic The topic context
   * @returns The best script with its score
   */
  async selectBestScript(
    scripts: VideoScript[],
    topic: string
  ): Promise<{ script: VideoScript; score: number }> {
    this.logger.log(`🔍 Comparing ${scripts.length} scripts...`);

    const scored = await Promise.all(
      scripts.map(async (script) => {
        const score = await this.evaluateScript(script, topic);
        return { script, score: score.totalScore };
      })
    );

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    this.logger.log(
      `✅ Best script selected: "${best.script.title}" (Score: ${best.score}/100)`
    );

    return best;
  }

  /**
   * Get optimization statistics and recommendations.
   * 
   * @param topic The topic to analyze
   * @returns Recommendations for optimization parameters
   */
  async getOptimizationRecommendations(topic: string): Promise<{
    recommendedGenerations: number;
    recommendedPopulationSize: number;
    estimatedDuration: number; // milliseconds
    estimatedCost: number; // API calls
  }> {
    // Simple heuristic: longer topics might need more optimization
    const topicLength = topic.length;
    const recommendedGenerations = topicLength > 100 ? 4 : 3;
    const recommendedPopulationSize = topicLength > 100 ? 6 : 4;

    // Estimate duration (rough calculation)
    const estimatedDuration = recommendedGenerations * recommendedPopulationSize * 5000; // ~5s per evaluation

    // Estimate API calls (script generation + scoring)
    const estimatedCost = recommendedGenerations * recommendedPopulationSize * 2; // 2 calls per individual

    return {
      recommendedGenerations,
      recommendedPopulationSize,
      estimatedDuration,
      estimatedCost,
    };
  }
}
