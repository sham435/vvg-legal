import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youtubeService: YoutubeService,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count videos generated today
    const videosGeneratedToday = await this.prisma.video.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Count published videos today
    const videosPublishedToday = await this.prisma.publishLog.count({
      where: {
        publishedAt: { gte: today },
        status: 'PUBLISHED',
      },
    });

    // Total views across all platforms
    const publishLogs = await this.prisma.publishLog.findMany({
      where: { status: 'PUBLISHED' },
    });

    const totalViews = publishLogs.reduce((sum, log) => sum + log.views, 0);
    const totalLikes = publishLogs.reduce((sum, log) => sum + log.likes, 0);

    // Estimated revenue (rough calculation: $2 CPM on average)
    const estimatedRevenue = (totalViews / 1000) * 2;

    return {
      videosGeneratedToday,
      videosPublishedToday,
      totalViews,
      totalLikes,
      estimatedRevenue: parseFloat(estimatedRevenue.toFixed(2)),
    };
  }

  /**
   * Get analytics by platform
   */
  async getAnalyticsByPlatform() {
    const platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];
    
    const analytics = await Promise.all(
      platforms.map(async (platform) => {
        const logs = await this.prisma.publishLog.findMany({
          where: { platform: platform as any, status: 'PUBLISHED' },
        });

        const views = logs.reduce((sum, log) => sum + log.views, 0);
        const likes = logs.reduce((sum, log) => sum + log.likes, 0);
        const videos = logs.length;

        return {
          platform,
          videos,
          views,
          likes,
        };
      }),
    );

    return analytics;
  }

  /**
   * Get recent videos with performance
   */
  async getRecentVideos(limit = 10) {
    const videos = await this.prisma.video.findMany({
      where: { status: { in: ['PUBLISHED', 'READY'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        publishLogs: true,
      },
    });

    return videos.map((video) => ({
      id: video.id,
      title: video.title,
      status: video.status,
      createdAt: video.createdAt,
      platforms: video.publishLogs.map((log) => ({
        platform: log.platform,
        views: log.views,
        likes: log.likes,
        url: log.platformUrl,
      })),
    }));
  }

  /**
   * Sync all platform analytics
   */
  async syncAllAnalytics() {
    // Sync YouTube
    await this.youtubeService.syncAnalytics();
    
    // TODO: Add TikTok and Instagram sync when APIs available

    return { success: true, message: 'Analytics synced' };
  }
}
