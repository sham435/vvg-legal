import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";
import { EngagementPredictor } from "./engagement-predictor";
import { TrendAnalyzer } from "./trend-analyzer";

@Module({
  imports: [
    ConfigModule,
    OrchestratorModule, // Needs router & cost optimizer
  ],
  providers: [EngagementPredictor, TrendAnalyzer],
  exports: [EngagementPredictor, TrendAnalyzer],
})
export class IntelligenceModule {}
