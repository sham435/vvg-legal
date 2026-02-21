import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TrendAnalyzer } from "../../ai/intelligence/trend-analyzer";
import { EvolutionEngine } from "../../ai/genetic/evolution-engine";
import { GeneticOptimizationService } from "../../ai/genetic/genetic-optimization.service";
import { AiService } from "../../modules/ai/ai.service";

@Injectable()
export class AutoSchedulerService {
  private readonly logger = new Logger(AutoSchedulerService.name);
  private useOptimizationService: boolean;

  constructor(
    private readonly trendAnalyzer: TrendAnalyzer,
    private readonly evolutionEngine: EvolutionEngine,
    private readonly geneticOptimizationService: GeneticOptimizationService,
    private readonly aiService: AiService,
  ) {
    // Use GeneticOptimizationService if available, fallback to EvolutionEngine
    this.useOptimizationService = true; // Can be made configurable
  }

  /**
   * TREND WATCHER: Runs every 6 hours.
   * Checks for rising trends and triggers content generation if a high-potential topic is found.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleTrendWatch() {
    this.logger.log("🔍 AutoScheduler: Starting Trend Watch...");

    try {
      // 1. Get current trends (Simulated or Real via API)
      // Since we don't have a real NewsAPI key in env yet, this might return mock data from the service logic
      const trends = await this.trendAnalyzer.analyzeCurrentTrends();

      this.logger.log(`Found ${trends.length} trending topics.`);

      // 2. Filter for "Viral" potential (>80 score)
      const viralTrends = trends.filter((t) => t.score > 80);

      if (viralTrends.length === 0) {
        this.logger.log("No super-viral trends found right now. Sleeping.");
        return;
      }

      // 3. Pick the top trend
      const bestTrend = viralTrends[0];
      this.logger.log(
        `🚀 AUTOMATION TRIGGERED: Found viral trend "${bestTrend.topic}" (Score: ${bestTrend.score})`,
      );

      // 4. Trigger Genetic Optimization
      this.logger.log(`🧬 Optimizing script for "${bestTrend.topic}"...`);

      let viralScript;
      if (this.useOptimizationService) {
        // Use the new GeneticOptimizationService for better metrics and features
        const result = await this.geneticOptimizationService.optimizeScript(
          bestTrend.topic,
          {
            generations: 3,
            populationSize: 4,
            targetScore: 80, // Match the trend threshold
            logProgress: true,
          },
        );
        viralScript = result.script;
        this.logger.log(
          `✅ Optimization complete. Final score: ${result.finalScore}/100`,
        );
      } else {
        // Fallback to direct EvolutionEngine usage
        viralScript = await this.evolutionEngine.evolveScript(
          bestTrend.topic,
          3,
          4,
        );
      }

      // 5. Hand off to AI Service for Video Generation (Cinematic Pipeline)
      // Note: We might want to create a queue job here instead of direct call to avoid timeout
      // For now, we log the success. In a real integration, we'd call this.aiService.generateVideoFromScript(viralScript)

      this.logger.log("✅ Script Evolved & Ready for Production:");
      this.logger.log(JSON.stringify(viralScript, null, 2));

      // TODO: Queue this script for Video Generation
    } catch (error) {
      this.logger.error("Error in Trend Watch job", error);
    }
  }

  /**
   * DAILY RECAP: Runs at midnight.
   * Ensures at least one video is generated per day if trends didn't trigger.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyFailSafe() {
    this.logger.log("🌙 AutoScheduler: Daily Failsafe Check");
    // Logic to check if we published today, if not, force generating an 'Evergreen' topic
  }
}
