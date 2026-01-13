import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload video to TikTok
   * Note: TikTok API requires developer approval and access token
   */
  async uploadVideo(
    videoPath: string,
    title: string,
    hashtags: string[] = [],
  ): Promise<string> {
    const accessToken = this.config.get<string>("TIKTOK_ACCESS_TOKEN");

    if (!accessToken) {
      throw new Error("TikTok access token not configured");
    }

    try {
      this.logger.log(`Uploading video to TikTok: ${title}`);

      // TikTok uses a multi-step upload process
      // Step 1: Initialize upload
      const initResponse = await axios.post(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        {
          post_info: {
            title,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: fs.statSync(videoPath).size,
            chunk_size: 10000000, // 10MB chunks
            total_chunk_count: 1,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const publishId = initResponse.data.data.publish_id;
      const uploadUrl = initResponse.data.data.upload_url;

      // Step 2: Upload video file
      const formData = new FormData();
      formData.append("video", fs.createReadStream(videoPath));

      await axios.put(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          "Content-Length": fs.statSync(videoPath).size,
        },
      });

      this.logger.log(`✅ Video uploaded to TikTok`);
      return publishId;
    } catch (error) {
      this.logger.error("Failed to upload to TikTok", error);
      throw error;
    }
  }

  /**
   * Publish video to TikTok with publish log
   */
  async publishVideo(videoId: string): Promise<void> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.localPath) {
      throw new Error("Video not found or no local file");
    }

    try {
      const publishLog = await this.prisma.publishLog.create({
        data: {
          videoId,
          platform: "TIKTOK",
          status: "UPLOADING",
        },
      });

      // Format hashtags
      const hashtagString = video.hashtags.map((tag) => `#${tag}`).join(" ");
      const caption = `${video.title}\n\n${hashtagString}`;

      const platformVideoId = await this.uploadVideo(
        video.localPath,
        caption.substring(0, 150), // TikTok limit
        video.hashtags,
      );

      await this.prisma.publishLog.update({
        where: { id: publishLog.id },
        data: {
          status: "PUBLISHED",
          platformVideoId,
          publishedAt: new Date(),
        },
      });

      this.logger.log(`✅ Publish log updated for TikTok`);
    } catch (error) {
      await this.prisma.publishLog.updateMany({
        where: {
          videoId,
          platform: "TIKTOK",
          status: "UPLOADING",
        },
        data: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Get all trending topics from TikTok
   */
  async getAccessToken(
    code: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
  }> {
    try {
      const clientKey = this.config.get<string>("TIKTOK_CLIENT_KEY");
      const clientSecret = this.config.get<string>("TIKTOK_CLIENT_SECRET");

      const params = new URLSearchParams();
      params.append("client_key", clientKey);
      params.append("client_secret", clientSecret);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", redirectUri);

      const response = await axios.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error("Failed to get TikTok access token", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh TikTok access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
  }> {
    try {
      const clientKey = this.config.get<string>("TIKTOK_CLIENT_KEY");
      const clientSecret = this.config.get<string>("TIKTOK_CLIENT_SECRET");

      const params = new URLSearchParams();
      params.append("client_key", clientKey);
      params.append("client_secret", clientSecret);
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", refreshToken);

      const response = await axios.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error("Failed to refresh TikTok access token", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Revoke TikTok access token
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      const clientKey = this.config.get<string>("TIKTOK_CLIENT_KEY");
      const clientSecret = this.config.get<string>("TIKTOK_CLIENT_SECRET");

      const params = new URLSearchParams();
      params.append("client_key", clientKey);
      params.append("client_secret", clientSecret);
      params.append("token", accessToken);

      await axios.post(
        "https://open.tiktokapis.com/v2/oauth/revoke/",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
          },
        },
      );
    } catch (error) {
      this.logger.error("Failed to revoke TikTok access", error.response?.data || error.message);
      throw error;
    }
  }
}
