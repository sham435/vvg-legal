import { Controller, Post, Get, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiProperty } from "@nestjs/swagger";
import { VideoService } from "./video.service";

class GenerateVideoDto {
  @ApiProperty({ description: "Video generation prompt" })
  prompt: string;

  @ApiProperty({
    description: "Video duration in seconds",
    required: false,
    default: 5,
  })
  duration?: number;

  @ApiProperty({
    description: "Topic for pre-generation scoring (optional)",
    required: false,
  })
  topic?: string;

  @ApiProperty({
    description: "Skip pre-generation scoring",
    required: false,
    default: false,
  })
  skipScoring?: boolean;
}

@ApiTags("Video")
@Controller("video")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get()
  @ApiOperation({ summary: "List all generated videos" })
  async findAll() {
    return this.videoService.getAllVideos();
  }

  @Post("generate")
  @ApiOperation({
    summary: "Generate single video from prompt",
    description:
      "Generates a video with optional pre-generation scoring to filter low-potential content",
  })
  async generateVideo(@Body() dto: GenerateVideoDto) {
    const result = await this.videoService.generateVideo(
      dto.prompt,
      dto.duration || 5,
      dto.topic,
      dto.skipScoring || false,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post("generate-from-script")
  @ApiOperation({ summary: "Generate all scenes from script" })
  async generateFromScript(@Body() body: { script: any }) {
    const results = await this.videoService.generateFromScript(body.script);
    return {
      success: true,
      data: results,
    };
  }
}
