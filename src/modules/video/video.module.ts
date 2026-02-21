import { Module } from "@nestjs/common";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { FreeVideoService } from "./free-video.service";
import { AiModule } from "../ai/ai.module";
import { VyroModule } from "../vyro/vyro.module";
import { IntelligenceModule } from "../../ai/intelligence/intelligence.module";

@Module({
  imports: [AiModule, VyroModule, IntelligenceModule],
  controllers: [VideoController],
  providers: [VideoService, FreeVideoService],
  exports: [VideoService],
})
export class VideoModule {}
