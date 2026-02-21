import { Module } from "@nestjs/common";
import { PublishService } from "./publish.service";
import { YoutubeModule } from "../youtube/youtube.module";

import { PublishController } from "./publish.controller";

@Module({
  imports: [YoutubeModule],
  controllers: [PublishController],
  providers: [PublishService],
  exports: [PublishService],
})
export class PublishModule {}
