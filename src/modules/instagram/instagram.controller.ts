import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { InstagramService } from "./instagram.service";

@ApiTags("Instagram")
@Controller("instagram")
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post("publish")
  @ApiOperation({ summary: "Publish Reel to Instagram" })
  async publishVideo(@Body() body: { videoId: string }) {
    await this.instagramService.publishVideo(body.videoId);
    return {
      success: true,
      message: "Reel published to Instagram",
    };
  }
}
