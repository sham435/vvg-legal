import { Module } from "@nestjs/common";
import { SystemController } from "./system.controller";
import { SettingsController } from "./settings.controller";
import { SystemService } from "./system.service";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [SchedulerModule, AiModule],
  controllers: [SystemController, SettingsController],
  providers: [SystemService],
})
export class SystemModule {}
