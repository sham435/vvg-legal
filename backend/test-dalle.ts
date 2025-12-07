
import { NestFactory } from '@nestjs/core';
import { AiModule } from './src/modules/ai/ai.module';
import { AiService } from './src/modules/ai/ai.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule,
  ],
})
class TestModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const aiService = app.get(AiService);

  try {
    console.log('Testing DALL-E 3 Generation...');
    const imageUrl = await aiService.generateImage('A futuristic city with flying cars, cyberpunk style');
    console.log('Success! Image URL:', imageUrl);
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
