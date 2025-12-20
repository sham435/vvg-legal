import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ThumbnailResponseDto {
  @ApiProperty({
    description: "Unique job ID",
    example: "job_123456789",
  })
  jobId: string;

  @ApiProperty({
    description: "Current status",
    example: "completed",
  })
  status: string;

  @ApiProperty({
    description: "Status message",
    example: "Thumbnail generated successfully",
  })
  message: string;

  @ApiPropertyOptional({
    description: "Thumbnail image URL (when completed)",
    example: "https://cdn.midjourney.com/image.png",
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: "Smaller thumbnail URL",
    example: "https://cdn.midjourney.com/thumb.png",
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: "Generation progress (0-100)",
    example: 100,
  })
  progress?: number;

  @ApiPropertyOptional({
    description: "Time taken to generate (milliseconds)",
    example: 45000,
  })
  generationTime?: number;

  @ApiPropertyOptional({
    description: "Provider used (official or discord)",
    example: "discord",
  })
  provider?: string;
}
