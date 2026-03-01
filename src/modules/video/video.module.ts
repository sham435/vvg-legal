import { Module } from "@nestjs/common";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { FreeVideoService } from "./free-video.service";
import { PixverseEngine } from "./engines/pixverse.engine";
import { VideoWebhookController } from "./webhook.controller";
import { AiModule } from "../ai/ai.module";
import { VyroModule } from "../vyro/vyro.module";
import { IntelligenceModule } from "../../ai/intelligence/intelligence.module";
import { StabilityAiModule } from "../StabilityAI/stability-ai.module";

@Module({
  imports: [AiModule, VyroModule, IntelligenceModule, StabilityAiModule],
  controllers: [VideoController, VideoWebhookController],
  providers: [VideoService, FreeVideoService, PixverseEngine],
  exports: [VideoService, PixverseEngine],
})
export class VideoModule {}
