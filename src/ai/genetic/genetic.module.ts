import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { AiModule } from "../../modules/ai/ai.module";
import { ScriptMutator } from "./script-mutator";
import { EvolutionEngine } from "./evolution-engine";
import { GeneticOptimizationService } from "./genetic-optimization.service";

@Module({
  imports: [ConfigModule, OrchestratorModule, IntelligenceModule, AiModule],
  providers: [ScriptMutator, EvolutionEngine, GeneticOptimizationService],
  exports: [
    ScriptMutator,
    EvolutionEngine,
    GeneticOptimizationService, // Export the new service
  ],
})
export class GeneticModule {}
