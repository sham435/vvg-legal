import { Controller, Get, Post } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get dashboard statistics" })
  async getDashboardStats() {
    const stats = await this.analyticsService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get("by-platform")
  @ApiOperation({ summary: "Get analytics by platform" })
  async getByPlatform() {
    const analytics = await this.analyticsService.getAnalyticsByPlatform();
    return {
      success: true,
      data: analytics,
    };
  }

  @Get("recent-videos")
  @ApiOperation({ summary: "Get recent videos with performance data" })
  async getRecentVideos() {
    const videos = await this.analyticsService.getRecentVideos();
    return {
      success: true,
      data: videos,
    };
  }

  @Post("sync")
  @ApiOperation({ summary: "Sync analytics from all platforms" })
  async syncAnalytics() {
    const result = await this.analyticsService.syncAllAnalytics();
    return result;
  }
}
