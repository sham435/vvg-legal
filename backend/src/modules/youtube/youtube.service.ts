import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private youtube: any;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeYoutube();
  }

  private initializeYoutube() {
    const clientId = this.config.get<string>('YOUTUBE_CLIENT_ID');
    const clientSecret = this.config.get<string>('YOUTUBE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('YOUTUBE_REDIRECT_URI');
    const refreshToken = this.config.get<string>('YOUTUBE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn('YouTube credentials not fully configured');
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    this.logger.log('✅ YouTube API initialized');
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(
    videoPath: string,
    title: string,
    description: string,
    tags: string[] = [],
  ): Promise<string> {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized');
    }

    try {
      this.logger.log(`Uploading video to YouTube: ${title}`);

      const requestBody = {
        snippet: {
          title,
          description,
          tags,
          categoryId: '22', // People & Blogs
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      const media = {
        body: fs.createReadStream(videoPath),
      };

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media,
      });

      const videoId = response.data.id;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      this.logger.log(`✅ Video uploaded to YouTube: ${videoUrl}`);
      return videoUrl;
    } catch (error) {
      this.logger.error('Failed to upload to YouTube', error);
      throw error;
    }
  }

  /**
   * Upload video and create publish log
   */
  async publishVideo(videoId: string): Promise<void> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.localPath) {
      throw new Error('Video not found or no local file');
    }

    try {
      // Create publish log
      const publishLog = await this.prisma.publishLog.create({
        data: {
          videoId,
          platform: 'YOUTUBE',
          status: 'UPLOADING',
        },
      });

      // Upload to YouTube
      const platformUrl = await this.uploadVideo(
        video.localPath,
        video.title,
        video.description || '',
        video.tags,
      );

      // Extract video ID from URL
      const platformVideoId = platformUrl.split('v=')[1];

      // Update publish log
      await this.prisma.publishLog.update({
        where: { id: publishLog.id },
        data: {
          status: 'PUBLISHED',
          platformVideoId,
          platformUrl,
          publishedAt: new Date(),
        },
      });

      this.logger.log(`✅ Publish log updated for YouTube`);
    } catch (error) {
      // Mark as failed
      await this.prisma.publishLog.updateMany({
        where: {
          videoId,
          platform: 'YOUTUBE',
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

  /**
   * Fetch analytics for a video
   */
  async getVideoAnalytics(videoId: string): Promise<any> {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized');
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['statistics'],
        id: [videoId],
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const stats = response.data.items[0].statistics;
      
      return {
        views: parseInt(stats.viewCount) || 0,
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch YouTube analytics', error);
      return null;
    }
  }

  /**
   * Update analytics for all YouTube videos
   */
  async syncAnalytics(): Promise<void> {
    const publishLogs = await this.prisma.publishLog.findMany({
      where: {
        platform: 'YOUTUBE',
        status: 'PUBLISHED',
        platformVideoId: { not: null },
      },
    });

    for (const log of publishLogs) {
      try {
        const analytics = await this.getVideoAnalytics(log.platformVideoId);
        
        if (analytics) {
          await this.prisma.publishLog.update({
            where: { id: log.id },
            data: {
              views: analytics.views,
              likes: analytics.likes,
              comments: analytics.comments,
              lastSyncedAt: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Failed to sync analytics for ${log.platformVideoId}`, error);
      }
    }

    this.logger.log('✅ YouTube analytics synced');
  }
}
