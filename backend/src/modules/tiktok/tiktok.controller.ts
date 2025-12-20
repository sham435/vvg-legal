import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { TiktokService } from "./tiktok.service";

@ApiTags("TikTok")
@Controller("tiktok")
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  @Post("publish")
  @ApiOperation({ summary: "Publish video to TikTok" })
  async publishVideo(@Body() body: { videoId: string }) {
    await this.tiktokService.publishVideo(body.videoId);
    return {
      success: true,
      message: "Video published to TikTok",
    };
  }
}
