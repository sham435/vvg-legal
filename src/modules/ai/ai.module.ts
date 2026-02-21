import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { OrchestratorModule } from "../../ai/orchestrator/orchestrator.module";
import { IntelligenceModule } from "../../ai/intelligence/intelligence.module";

@Module({
  imports: [OrchestratorModule, IntelligenceModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
