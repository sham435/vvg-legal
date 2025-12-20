import { IsString, IsOptional, IsBoolean, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateThumbnailDto {
  @ApiProperty({
    description: "Prompt for thumbnail generation",
    example: "futuristic cityscape at sunset, cinematic, 8k",
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: "Aspect ratio (default: 16:9 for YouTube)",
    example: "16:9",
  })
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional({
    description: "Stylize value (0-1000)",
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  stylize?: number;

  @ApiPropertyOptional({
    description: "Quality value",
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  quality?: number;

  @ApiPropertyOptional({
    description: "Force use of official API (bypass cost-saving mode)",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  forceOfficial?: boolean;
}
