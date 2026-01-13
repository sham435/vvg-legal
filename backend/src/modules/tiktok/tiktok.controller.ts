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

  @Post("oauth/token")
  @ApiOperation({ summary: "Exchange authorization code for tokens" })
  async getTokens(@Body() body: { code: string; redirectUri: string }) {
    return this.tiktokService.getAccessToken(body.code, body.redirectUri);
  }

  @Post("oauth/refresh")
  @ApiOperation({ summary: "Refresh access token" })
  async refreshTokens(@Body() body: { refreshToken: string }) {
    return this.tiktokService.refreshAccessToken(body.refreshToken);
  }

  @Post("oauth/revoke")
  @ApiOperation({ summary: "Revoke access token" })
  async revokeAccess(@Body() body: { accessToken: string }) {
    await this.tiktokService.revokeAccess(body.accessToken);
    return {
      success: true,
      message: "Access revoked",
    };
  }
}
