import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { VideoMetricsService } from "../../monitoring/video-metrics.service";

@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly metricsService: VideoMetricsService) {}

  @Get("metrics")
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.set("Content-Type", this.metricsService.getMetricsContentType());
    res.send(metrics);
  }
}
