import { Module } from "@nestjs/common";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { AiModule } from "../ai/ai.module";
import { VyroModule } from "../vyro/vyro.module";

@Module({
  imports: [AiModule, VyroModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
