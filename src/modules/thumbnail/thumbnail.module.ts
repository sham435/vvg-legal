import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ThumbnailService } from "./thumbnail.service";
import { ThumbnailController } from "./thumbnail.controller";
import { VideoModule } from "../video/video.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 90000,
      maxRedirects: 5,
    }),
    ConfigModule,
    VideoModule,
  ],
  controllers: [ThumbnailController],
  providers: [ThumbnailService],
  exports: [ThumbnailService],
})
export class ThumbnailModule {}
