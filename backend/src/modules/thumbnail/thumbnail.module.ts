import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThumbnailService } from './thumbnail.service';
import { ThumbnailController } from './thumbnail.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 90000, // 90 seconds for Midjourney API
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [ThumbnailController],
  providers: [ThumbnailService],
  exports: [ThumbnailService],
})
export class ThumbnailModule {}

