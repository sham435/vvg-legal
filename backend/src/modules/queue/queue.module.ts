import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoGenerationProcessor } from '../../jobs/video-generation.processor';
import { VideoUploadProcessor } from '../../jobs/video-upload.processor';
import { TrendsModule } from '../trends/trends.module';
import { AiModule } from '../ai/ai.module';
import { VideoModule } from '../video/video.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { TiktokModule } from '../tiktok/tiktok.module';
import { InstagramModule } from '../instagram/instagram.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-generation',
    }),
    BullModule.registerQueue({
      name: 'video-upload',
    }),
    TrendsModule,
    AiModule,
    VideoModule,
    YoutubeModule,
    TiktokModule,
    InstagramModule,
    NotificationsModule,
  ],
  providers: [VideoGenerationProcessor, VideoUploadProcessor],
})
export class QueueModule {}
