import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SchedulerService } from './src/modules/scheduler/scheduler.service';
import { TrendsService } from './src/modules/trends/trends.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ManualTrigger');
  
  try {
    logger.log('Initializing Viral Video Generator context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const schedulerService = app.get(SchedulerService);
    const trendsService = app.get(TrendsService);
    
    logger.log('📰 Fetching fresh trending topics...');
    const count = await trendsService.saveTrendingTopics();
    logger.log(`Found and saved ${count} new topics.`);

    logger.log('🚀 Triggering manual video generation pipeline...');
    
    // Trigger generation (this will fetch news, pick topic, and queue generation)
    // The processor modification we made will then queue the upload automatically.
    const result = await schedulerService.triggerManualGeneration();
    
    logger.log(`✅ Pipeline triggered successfully!`);
    logger.log(`Topic ID: ${result.topicId}`);
    logger.log('The system is now:\n1. Generating script\n2. Generating video\n3. Uploading to YouTube');
    logger.log('Check the logs or database for progress.');
    
    await app.close();
  } catch (error) {
    logger.error('Failed to trigger pipeline', error);
    process.exit(1);
  }
}

bootstrap();
