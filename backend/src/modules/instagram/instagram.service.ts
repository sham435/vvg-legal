import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload Reel to Instagram using Graph API
   * Requires Facebook Business Page linked to Instagram Business account
   */
  async uploadReel(
    videoUrl: string,
    caption: string,
  ): Promise<string> {
    const accessToken = this.config.get<string>('INSTAGRAM_ACCESS_TOKEN');
    const accountId = this.config.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !accountId) {
      throw new Error('Instagram credentials not configured');
    }

    try {
      this.logger.log('Uploading Reel to Instagram...');

      // Step 1: Create media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption,
          share_to_feed: true,
        },
        {
          params: { access_token: accessToken },
        },
      );

      const creationId = containerResponse.data.id;

      // Step 2: Poll for container status
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 60;

      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${creationId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken,
            },
          },
        );

        status = statusResponse.data.status_code;
        attempts++;
      }

      if (status !== 'FINISHED') {
        throw new Error('Instagram Reel processing failed or timed out');
      }

      // Step 3: Publish the container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
        {
          creation_id: creationId,
        },
        {
          params: { access_token: accessToken },
        },
      );

      const mediaId = publishResponse.data.id;
      this.logger.log(`✅ Reel published to Instagram: ${mediaId}`);

      return mediaId;
    } catch (error) {
      this.logger.error('Failed to upload to Instagram', error);
      throw error;
    }
  }

  /**
   * Publish video to Instagram with publish log
   */
  async publishVideo(videoId: string): Promise<void> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.s3Url) {
      throw new Error('Video not found or no S3 URL (Instagram requires public URL)');
    }

    try {
      const publishLog = await this.prisma.publishLog.create({
        data: {
          videoId,
          platform: 'INSTAGRAM',
          status: 'UPLOADING',
        },
      });

      // Format caption
      const hashtagString = video.hashtags.map((tag) => `#${tag}`).join(' ');
      const caption = `${video.title}\n\n${hashtagString}`;

      const platformVideoId = await this.uploadReel(video.s3Url, caption);

      await this.prisma.publishLog.update({
        where: { id: publishLog.id },
        data: {
          status: 'PUBLISHED',
          platformVideoId,
          publishedAt: new Date(),
        },
      });

      this.logger.log(`✅ Publish log updated for Instagram`);
    } catch (error) {
      await this.prisma.publishLog.updateMany({
        where: {
          videoId,
          platform: 'INSTAGRAM',
          status: 'UPLOADING',
        },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }
}
