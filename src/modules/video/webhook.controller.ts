import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { Sora2Service } from "./engines/sora2.service";

@Controller("api/v1/video/webhook")
export class VideoWebhookController {
  private readonly logger = new Logger(VideoWebhookController.name);

  constructor(private readonly sora2Service: Sora2Service) {}

  @Post("sora2")
  @HttpCode(HttpStatus.OK)
  async handleSora2Webhook(@Body() payload: any) {
    this.logger.log("Received Sora2 webhook");
    await this.sora2Service.handleWebhook(payload);
    return { received: true };
  }
}
