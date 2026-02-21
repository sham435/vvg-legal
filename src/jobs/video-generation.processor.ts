import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../common/prisma/prisma.service";
import { AiService } from "../modules/ai/ai.service";
import { VideoService } from "../modules/video/video.service";
import { TrendsService } from "../modules/trends/trends.service";
import { NotificationsService } from "../modules/notifications/notifications.service";

@Processor("video-generation")
export class VideoGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly videoService: VideoService,
    private readonly trendsService: TrendsService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue("video-upload") private readonly uploadQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { topicId, topic, description } = job.data;

    this.logger.log(`Processing video generation for: ${topic}`);

    try {
      // Step 1: Generate script
      job.updateProgress(10);
      this.logger.log("Generating script...");

      const script = await this.aiService.generateCinematicScript(
        topic,
        description,
      );

      // Step 2: Create video record
      job.updateProgress(20);
      const video = await this.prisma.video.create({
        data: {
          title: script.title,
          description: `${script.hook}\n\nGenerated from trending topic: ${topic}`,
          script: JSON.stringify(script),
          scenes: script.scenes as any,
          status: "GENERATING_VIDEO",
          trendingTopicId: topicId,
          hashtags: script.hashtags,
          tags: script.hashtags,
        },
      });

      this.logger.log(`Video record created: ${video.id}`);

      // Use the full script object to generate and merge all scenes
      const videoResult = await this.videoService.generateFromScript(script);

      job.updateProgress(70);

      // Step 4: Download video locally
      const filename = `${video.id}.mp4`;
      const localPath = await this.videoService.downloadVideo(
        videoResult.videoUrl,
        filename,
      );

      // Step 5: Update video record
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          status: "READY",
          videoUrl: videoResult.videoUrl,
          localPath,
          videoEngine: videoResult.engine,
          duration: videoResult.duration,
          generatedAt: new Date(),
        },
      });

      // Mark topic as used
      if (topicId) {
        await this.trendsService.markTopicAsUsed(topicId);
      }

      job.updateProgress(100);
      this.logger.log(`✅ Video generation complete: ${video.id}`);

      // Send success notification
      await this.notificationsService.sendVideoGeneratedNotification(
        video.id,
        script.title,
      );

      // Step 6: Trigger Upload
      this.logger.log(`Triggering upload for video: ${video.id}`);
      await this.uploadQueue.add("upload-video", {
        videoId: video.id,
        platforms: ["youtube"], // Default to YouTube for now
      });

      return { videoId: video.id, title: script.title };
    } catch (error) {
      this.logger.error("Video generation failed", error);

      // Send error notification
      await this.notificationsService.sendErrorAlert(
        "Video generation failed",
        error.message,
      );

      throw error;
    }
  }
}
