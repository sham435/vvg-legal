import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { IntelligentRouter } from "./intelligent-router";
import { CostOptimizer } from "./cost-optimizer";
import { FallbackCascade } from "./fallback-cascade";

@Module({
  imports: [ConfigModule],
  providers: [IntelligentRouter, CostOptimizer, FallbackCascade],
  exports: [IntelligentRouter, CostOptimizer, FallbackCascade],
})
export class OrchestratorModule {}
