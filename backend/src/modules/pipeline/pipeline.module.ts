import { Module } from "@nestjs/common";
import { PipelineService } from "./pipeline.service";
import { PipelineController } from "./pipeline.controller";
import { NewsModule } from "../news/news.module";
import { ScriptModule } from "../script/script.module";
import { VyroModule } from "../vyro/vyro.module";
import { VideoModule } from "../video/video.module";

@Module({
  imports: [NewsModule, ScriptModule, VyroModule, VideoModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
