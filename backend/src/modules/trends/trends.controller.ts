import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrendsService } from './trends.service';

@ApiTags('Trends')
@Controller('trends')
export class TrendsController {
  constructor(private readonly trendsService: TrendsService) {}

  @Post('fetch')
  @ApiOperation({ summary: 'Manually fetch trending topics' })
  async fetchTrends() {
    const count = await this.trendsService.saveTrendingTopics();
    return {
      success: true,
      message: `Fetched ${count} new trending topics`,
      count,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all trending topics' })
  async getTrends(
    @Query('limit') limit?: string,
    @Query('includeUsed') includeUsed?: string,
  ) {
    const topics = await this.trendsService.getAllTopics(
      limit ? parseInt(limit) : 20,
      includeUsed === 'true',
    );
    return {
      success: true,
      data: topics,
    };
  }

  @Get('best')
  @ApiOperation({ summary: 'Get best unused topic' })
  async getBestTopic() {
    const topic = await this.trendsService.getBestUnusedTopic();
    return {
      success: true,
      data: topic,
    };
  }
}
