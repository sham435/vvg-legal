import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { StabilityAiService } from "./stability-ai.service";
import { StabilityAiController } from "./stability-ai.controller";

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [StabilityAiService],
  controllers: [StabilityAiController],
  exports: [StabilityAiService],
})
export class StabilityAiModule {}
