
import { NestFactory } from '@nestjs/core';
import { ThumbnailModule } from './src/modules/thumbnail/thumbnail.module';
import { ThumbnailService } from './src/modules/thumbnail/thumbnail.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    ThumbnailModule, // Or just providers if module is complex
  ],
})
class TestModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestModule);
  // Might need to resolve ThumbnailService from the app
  const thumbnailService = app.get(ThumbnailService);

  try {
    console.log('Testing Midjourney Generation...');
    // Note: options might affect speed/cost.
    const result = await thumbnailService.generateThumbnail(
      'A cinematic shot of a robot painting on canvas', 
      { aspectRatio: '9:16' }
    );
    console.log('Success!', result);
  } catch (error) {
    console.error('Failed:', error.message);
    if (error.response) console.error('Response:', error.response.data);
  } finally {
    await app.close();
  }
}

bootstrap();
