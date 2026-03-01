import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { Json2VideoService } from "./json2video.service";

@Controller("api/v1/video/webhook")
export class VideoWebhookController {
  private readonly logger = new Logger(VideoWebhookController.name);

  constructor(private readonly json2VideoService: Json2VideoService) {}

  @Post("json2video")
  @HttpCode(HttpStatus.OK)
  async handleJson2VideoWebhook(@Body() payload: any) {
    this.logger.log("Received JSON2Video webhook");
    await this.json2VideoService.handleWebhook(payload);
    return { received: true };
  }
}
