import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';

@ApiTags('Scheduler')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger video generation' })
  async trigger(@Body() body: { topicId?: string }) {
    const result = await this.schedulerService.triggerManualGeneration(body.topicId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get scheduler settings' })
  getSettings() {
    return {
      success: true,
      data: this.schedulerService.getSettings(),
    };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update scheduler settings' })
  async updateSettings(@Body() settings: any) {
    const result = await this.schedulerService.updateSettings(settings);
    return {
      success: true,
      data: result,
    };
  }
}
