import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { FreeVideoService } from "./free-video.service";
import { PixverseEngine } from "./engines/pixverse.engine";
import { Sora2Service } from "./engines/sora2.service";
import { FalService } from "./engines/fal.service";
import { VideoWebhookController } from "./webhook.controller";
import { AiModule } from "../ai/ai.module";
import { VyroModule } from "../vyro/vyro.module";
import { IntelligenceModule } from "../../ai/intelligence/intelligence.module";
import { StabilityAiModule } from "../StabilityAI/stability-ai.module";

@Module({
  imports: [HttpModule, AiModule, VyroModule, IntelligenceModule, StabilityAiModule],
  controllers: [VideoController, VideoWebhookController],
  providers: [VideoService, FreeVideoService, PixverseEngine, Sora2Service, FalService],
  exports: [VideoService, PixverseEngine, Sora2Service, FalService],
})
export class VideoModule {}
