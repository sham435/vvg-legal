import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { YoutubeService } from "../modules/youtube/youtube.service";
import { TiktokService } from "../modules/tiktok/tiktok.service";
import { InstagramService } from "../modules/instagram/instagram.service";
import { NotificationsService } from "../modules/notifications/notifications.service";

@Processor("video-upload")
export class VideoUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoUploadProcessor.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly tiktokService: TiktokService,
    private readonly instagramService: InstagramService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { videoId, platforms } = job.data;

    this.logger.log(`Processing upload for video: ${videoId}`);

    const results = {
      youtube: null,
      tiktok: null,
      instagram: null,
    };

    const errors = [];

    // Upload to each platform
    if (platforms.includes("youtube")) {
      try {
        await this.youtubeService.publishVideo(videoId);
        results.youtube = "success";
        job.updateProgress(33);
      } catch (error) {
        this.logger.error("YouTube upload failed", error);
        results.youtube = "failed";
        errors.push({ platform: "YouTube", error: error.message });
      }
    }

    if (platforms.includes("tiktok")) {
      try {
        await this.tiktokService.publishVideo(videoId);
        results.tiktok = "success";
        job.updateProgress(66);
      } catch (error) {
        this.logger.error("TikTok upload failed", error);
        results.tiktok = "failed";
        errors.push({ platform: "TikTok", error: error.message });
      }
    }

    if (platforms.includes("instagram")) {
      try {
        await this.instagramService.publishVideo(videoId);
        results.instagram = "success";
        job.updateProgress(100);
      } catch (error) {
        this.logger.error("Instagram upload failed", error);
        results.instagram = "failed";
        errors.push({ platform: "Instagram", error: error.message });
      }
    }

    // Send notification
    const successCount = Object.values(results).filter(
      (r) => r === "success",
    ).length;

    if (successCount > 0) {
      await this.notificationsService.sendVideoPublishedNotification(
        videoId,
        results,
      );
    }

    if (errors.length > 0) {
      await this.notificationsService.sendErrorAlert(
        "Some platform uploads failed",
        JSON.stringify(errors),
      );
    }

    return results;
  }
}
