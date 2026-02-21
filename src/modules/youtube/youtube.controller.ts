import { Controller, Post, Body, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { YoutubeService } from "./youtube.service";

@ApiTags("YouTube")
@Controller("youtube")
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post("publish")
  @ApiOperation({ summary: "Publish video to YouTube" })
  async publishVideo(@Body() body: { videoId: string }) {
    await this.youtubeService.publishVideo(body.videoId);
    return {
      success: true,
      message: "Video published to YouTube",
    };
  }

  @Post("sync-analytics")
  @ApiOperation({ summary: "Sync analytics for all YouTube videos" })
  async syncAnalytics() {
    await this.youtubeService.syncAnalytics();
    return {
      success: true,
      message: "Analytics synced",
    };
  }
}
