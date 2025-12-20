import { Controller, Post, Get, Body, Param, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ThumbnailService } from "./thumbnail.service";
import { GenerateThumbnailDto } from "./dto/generate-thumbnail.dto";
import { ThumbnailResponseDto } from "./dto/thumbnail-response.dto";

@ApiTags("thumbnail")
@Controller("thumbnail")
export class ThumbnailController {
  private readonly logger = new Logger(ThumbnailController.name);

  constructor(private readonly thumbnailService: ThumbnailService) {}

  @Post("generate")
  @ApiOperation({ summary: "Generate a thumbnail for viral video" })
  @ApiResponse({
    status: 200,
    description: "Thumbnail generation initiated",
    type: ThumbnailResponseDto,
  })
  async generateThumbnail(
    @Body() dto: GenerateThumbnailDto,
  ): Promise<ThumbnailResponseDto> {
    this.logger.log(
      `Thumbnail generation request: ${dto.prompt.substring(0, 30)}...`,
    );

    const result = await this.thumbnailService.generateThumbnail(dto.prompt, {
      aspectRatio: dto.aspectRatio,
      stylize: dto.stylize,
      quality: dto.quality,
      forceOfficial: dto.forceOfficial,
    });

    return result as ThumbnailResponseDto;
  }

  @Get("status/:jobId")
  @ApiOperation({ summary: "Check thumbnail generation status" })
  @ApiResponse({
    status: 200,
    description: "Job status retrieved",
    type: ThumbnailResponseDto,
  })
  async getStatus(
    @Param("jobId") jobId: string,
  ): Promise<ThumbnailResponseDto> {
    const result = await this.thumbnailService.getThumbnailStatus(jobId);
    return result as ThumbnailResponseDto;
  }
}
