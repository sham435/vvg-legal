import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { SchedulerController } from "./scheduler.controller";
import { SchedulerService } from "./scheduler.service";
import { TrendsModule } from "../trends/trends.module";
import { AiModule } from "../ai/ai.module";
import { VideoModule } from "../video/video.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PipelineModule } from "../pipeline/pipeline.module";
import { PublishModule } from "../publish/publish.module";
import { GeneticModule } from "../../ai/genetic/genetic.module";
import { IntelligenceModule } from "../../ai/intelligence/intelligence.module";
import { AutoSchedulerService } from "./auto-scheduler.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "video-generation",
    }),
    BullModule.registerQueue({
      name: "video-upload",
    }),
    TrendsModule,
    AiModule,
    VideoModule,
    NotificationsModule,
    PipelineModule,
    PublishModule,
    GeneticModule,
    IntelligenceModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, AutoSchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
