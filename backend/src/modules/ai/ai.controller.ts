import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';

class GenerateScriptDto {
  topic: string;
  description?: string;
}

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-script')
  @ApiOperation({ summary: 'Generate video script from topic' })
  async generateScript(@Body() dto: GenerateScriptDto) {
    const script = await this.aiService.generateScript(dto.topic, dto.description);
    return {
      success: true,
      data: script,
    };
  }

  @Post('thumbnail-prompt')
  @ApiOperation({ summary: 'Generate thumbnail prompt from script' })
  async generateThumbnailPrompt(@Body() body: { script: any }) {
    const prompt = await this.aiService.generateThumbnailPrompt(body.script);
    return {
      success: true,
      data: { prompt },
    };
  }
}
