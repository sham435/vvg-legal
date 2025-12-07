import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VideoService } from './video.service';

class GenerateVideoDto {
  prompt: string;
  duration?: number;
}

@ApiTags('Video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate single video from prompt' })
  async generateVideo(@Body() dto: GenerateVideoDto) {
    const result = await this.videoService.generateVideo(dto.prompt, dto.duration || 5);
    return {
      success: true,
      data: result,
    };
  }

  @Post('generate-from-script')
  @ApiOperation({ summary: 'Generate all scenes from script' })
  async generateFromScript(@Body() body: { script: any }) {
    const results = await this.videoService.generateFromScript(body.script);
    return {
      success: true,
      data: results,
    };
  }
}
