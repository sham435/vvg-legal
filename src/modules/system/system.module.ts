import { Module } from "@nestjs/common";
import { SystemController } from "./system.controller";
import { SettingsController } from "./settings.controller";
import { HealthController } from "./health.controller";
import { SystemService } from "./system.service";
import { VideoMetricsService } from "../../monitoring/video-metrics.service";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../../common/prisma/prisma.module";

import { MonitoringController } from "./monitoring.controller";

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [
    SystemController,
    SettingsController,
    HealthController,
    MonitoringController,
  ],
  providers: [SystemService, VideoMetricsService],
  exports: [VideoMetricsService],
})
export class SystemModule {}
