import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrendsService } from '../trends/trends.service';
import { AiService } from '../ai/ai.service';
import { VideoService } from '../video/video.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isAutoGenerationEnabled = false;
  private requiresManualApproval = true;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly trendsService: TrendsService,
    private readonly aiService: AiService,
    private readonly videoService: VideoService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('video-generation') private videoQueue: Queue,
    @InjectQueue('video-upload') private uploadQueue: Queue,
  ) {
    // Load settings from config
    this.isAutoGenerationEnabled = this.config.get<string>('ENABLE_AUTO_GENERATION') === 'true';
    this.requiresManualApproval = this.config.get<string>('REQUIRE_MANUAL_APPROVAL') === 'true';
  }

  /**
   * Hourly cron job to generate viral videos
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyVideoGeneration() {
    if (!this.isAutoGenerationEnabled) {
      this.logger.log('Auto-generation disabled, skipping');
      return;
    }

    this.logger.log('🎬 Starting hourly video generation...');

    try {
      // Fetch fresh trending topics
      await this.trendsService.saveTrendingTopics();

      // Get best unused topic
      const topic = await this.trendsService.getBestUnusedTopic();

      if (!topic) {
        this.logger.warn('No unused trending topics available');
        return;
      }

      // Add to queue for processing
      await this.videoQueue.add('generate-video', {
        topicId: topic.id,
        topic: topic.title,
        description: topic.description,
      });

      this.logger.log(`✅ Video generation queued for: ${topic.title}`);
    } catch (error) {
      this.logger.error('Hourly generation failed', error);
      await this.notificationsService.sendErrorAlert('Hourly video generation failed', error.message);
    }
  }

  /**
   * Daily analytics sync
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyAnalyticsSync() {
    this.logger.log('📊 Syncing analytics...');
    // This will be triggered from analytics module
  }

  /**
   * Trigger manual video generation
   */
  async triggerManualGeneration(topicId?: string) {
    let topic;

    if (topicId) {
      topic = await this.prisma.trendingTopic.findUnique({
        where: { id: topicId },
      });
    } else {
      topic = await this.trendsService.getBestUnusedTopic();
    }

    if (!topic) {
      throw new Error('No topic available');
    }

    await this.videoQueue.add('generate-video', {
      topicId: topic.id,
      topic: topic.title,
      description: topic.description,
    });

    return { message: 'Video generation started', topicId: topic.id };
  }

  /**
   * Update scheduler settings
   */
  async updateSettings(settings: {
    enableAutoGeneration?: boolean;
    requireManualApproval?: boolean;
  }) {
    if (settings.enableAutoGeneration !== undefined) {
      this.isAutoGenerationEnabled = settings.enableAutoGeneration;
      await this.prisma.settings.upsert({
        where: { key: 'ENABLE_AUTO_GENERATION' },
        create: {
          key: 'ENABLE_AUTO_GENERATION',
          value: settings.enableAutoGeneration,
        },
        update: {
          value: settings.enableAutoGeneration,
        },
      });
    }

    if (settings.requireManualApproval !== undefined) {
      this.requiresManualApproval = settings.requireManualApproval;
      await this.prisma.settings.upsert({
        where: { key: 'REQUIRE_MANUAL_APPROVAL' },
        create: {
          key: 'REQUIRE_MANUAL_APPROVAL',
          value: settings.requireManualApproval,
        },
        update: {
          value: settings.requireManualApproval,
        },
      });
    }

    return {
      enableAutoGeneration: this.isAutoGenerationEnabled,
      requireManualApproval: this.requiresManualApproval,
    };
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enableAutoGeneration: this.isAutoGenerationEnabled,
      requireManualApproval: this.requiresManualApproval,
    };
  }
}
