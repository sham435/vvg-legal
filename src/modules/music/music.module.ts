import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MusicController } from "./music.controller";
import { MusicService } from "./music.service";

@Module({
  imports: [HttpModule],
  controllers: [MusicController],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}
