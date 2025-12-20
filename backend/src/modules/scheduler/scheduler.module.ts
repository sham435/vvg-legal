import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { SchedulerController } from "./scheduler.controller";
import { SchedulerService } from "./scheduler.service";
import { TrendsModule } from "../trends/trends.module";
import { AiModule } from "../ai/ai.module";
import { VideoModule } from "../video/video.module";
import { NotificationsModule } from "../notifications/notifications.module";

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
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
