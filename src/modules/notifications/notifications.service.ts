import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private webhookUrl: string;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl = this.config.get<string>("DISCORD_WEBHOOK_URL");
  }

  /**
   * Send Discord webhook notification
   */
  private async sendDiscordNotification(
    message: string,
    color: number = 5814783,
  ) {
    if (
      !this.webhookUrl ||
      this.webhookUrl.includes("your_discord_webhook_url") ||
      !this.webhookUrl.startsWith("http")
    ) {
      this.logger.warn("Discord webhook not configured or invalid");
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        embeds: [
          {
            description: message,
            color,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      this.logger.error("Failed to send Discord notification", error);
    }
  }

  /**
   * Notify when video generation is complete
   */
  async sendVideoGeneratedNotification(videoId: string, title: string) {
    const message = `✅ **Video Generated**\n\nTitle: ${title}\nID: ${videoId}\nStatus: Ready for publishing`;
    await this.sendDiscordNotification(message, 3066993); // Green
    this.logger.log(`Notification sent: Video generated - ${title}`);
  }

  /**
   * Notify when video is published
   */
  async sendVideoPublishedNotification(videoId: string, platforms: any) {
    const platformList = Object.entries(platforms)
      .filter(([_, status]) => status === "success")
      .map(([platform]) => platform)
      .join(", ");

    const message = `🚀 **Video Published**\n\nID: ${videoId}\nPlatforms: ${platformList}`;
    await this.sendDiscordNotification(message, 3447003); // Blue
    this.logger.log(`Notification sent: Video published - ${videoId}`);

    // Trigger GitHub Email Pipe
    const title = platforms.title || videoId;
    await this.triggerGitHubNotification(videoId, title);
  }

  /**
   * Trigger GitHub Repository Dispatch for Email Notification
   */
  private async triggerGitHubNotification(videoId: string, title: string) {
    const token = this.config.get<string>("GITHUB_NOTIFY_TOKEN");
    const owner = this.config.get<string>("GITHUB_REPO_OWNER");
    const repo = this.config.get<string>("GITHUB_REPO_NAME");

    if (!token || !owner || !repo) {
      this.logger.warn(
        "GitHub notification credentials (token/owner/repo) not fully configured. Skipping email pipe.",
      );
      return;
    }

    try {
      this.logger.log(`Dispatching GitHub notification for video: ${videoId}`);
      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/dispatches`,
        {
          event_type: "upload_success",
          client_payload: {
            videoId,
            title,
            engine: "cinematic-multi-model",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      this.logger.log("✅ GitHub notification dispatch successful");
    } catch (error) {
      this.logger.error(
        "Failed to dispatch GitHub notification",
        error.response?.data || error.message,
      );
    }
  }

  /**
   * Send error alert
   */
  async sendErrorAlert(title: string, error: string) {
    const message = `❌ **Error: ${title}**\n\n\`\`\`\n${error}\n\`\`\``;
    await this.sendDiscordNotification(message, 15158332); // Red
    this.logger.log(`Error notification sent: ${title}`);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats: {
    videosGenerated: number;
    videosPublished: number;
    totalViews: number;
    estimatedRevenue: number;
  }) {
    const message =
      `📊 **Daily Summary**\n\n` +
      `Videos Generated: ${stats.videosGenerated}\n` +
      `Videos Published: ${stats.videosPublished}\n` +
      `Total Views: ${stats.totalViews.toLocaleString()}\n` +
      `Estimated Revenue: $${stats.estimatedRevenue.toFixed(2)}`;

    await this.sendDiscordNotification(message, 16776960); // Gold
    this.logger.log("Daily summary sent");
  }
}
