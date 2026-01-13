import { Controller, Post, Get, Body } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SchedulerService } from "./scheduler.service";

@ApiTags("Scheduler")
@Controller("scheduler")
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @ApiOperation({ summary: "Get scheduler status (root endpoint)" })
  getRootStatus() {
    return this.schedulerService.getStatus();
  }

  @Get("status")
  @ApiOperation({ summary: "Get scheduler status" })
  getStatus() {
    return this.schedulerService.getStatus();
  }

  @Get("diag")
  @ApiOperation({ summary: "Get system diagnostics" })
  getDiag() {
    return this.schedulerService.getDiagnostics();
  }

  @Post("run-now")
  @ApiOperation({ summary: "Trigger immediate execution" })
  runNow() {
    return this.schedulerService.handleHourlyVideoGeneration();
  }

  @Post("start")
  @ApiOperation({ summary: "Start the scheduler" })
  start() {
    return this.schedulerService.startCron();
  }

  @Post("stop")
  @ApiOperation({ summary: "Stop the scheduler" })
  stop() {
    return this.schedulerService.stopCron();
  }

  @Post("restart")
  @ApiOperation({ summary: "Restart the scheduler" })
  restart() {
    return this.schedulerService.restart();
  }

  // Keep legacy settings endpoints if needed, or remove if fully replaced by System/Settings module.
  // For now I will keep them to avoid breaking existing frontend generic settings calls if any.
  @Get("settings")
  getSettings() {
    return this.schedulerService.getSettings();
  }

  @Post("settings")
  updateSettings(@Body() settings: any) {
    return this.schedulerService.updateSettings(settings);
  }
}
