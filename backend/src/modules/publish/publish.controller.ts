import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  NotFoundException,
} from "@nestjs/common";
import { PublishService } from "./publish.service";
import { UpdateVideoMetadataDto } from "./dto/update-metadata.dto";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("publish")
export class PublishController {
  constructor(
    private readonly publishService: PublishService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get("status")
  async getPublishStatus() {
    const logs = await this.prisma.publishLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        video: {
          select: {
            title: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      videoTitle: log.video ? log.video.title : "Unknown Video",
    }));
  }

  @Patch(":videoId/metadata")
  async updateMetadata(
    @Param("videoId") videoId: string,
    @Body() dto: UpdateVideoMetadataDto,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException("Video not found");
    }

    return this.prisma.video.update({
      where: { id: videoId },
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags,
      },
    });
  }

  @Post(":videoId/retry")
  async retryPublish(@Param("videoId") videoId: string) {
    // This will re-trigger the publish logic for YouTube
    // It creates a NEW log entry usually, or updates existing if designed that way
    // For now we just call the service method
    try {
      await this.publishService.publishVideoById(videoId);
      return { success: true, message: "Upload triggered" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @Get("credentials")
  getCredentialStatus() {
    const ytClient = this.config.get("YOUTUBE_CLIENT_ID");
    const ytSecret = this.config.get("YOUTUBE_CLIENT_SECRET");
    const ytToken = this.config.get("YOUTUBE_REFRESH_TOKEN");

    return {
      youtube: {
        hasClientId: !!ytClient,
        hasClientSecret: !!ytSecret,
        hasRefreshToken: !!ytToken,
        clientIdMasked: ytClient ? `${ytClient.substring(0, 5)}...` : null,
      },
    };
  }
}
