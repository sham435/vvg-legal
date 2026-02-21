import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SystemService } from "./system.service";

@ApiTags("system")
@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("status")
  @ApiOperation({ summary: "Get aggregated system status" })
  async getStatus() {
    return this.systemService.getSystemStatus();
  }

  @Post("control")
  @ApiOperation({ summary: "Control a specific service" })
  async controlService(
    @Body() body: { target: string; action: "start" | "stop" | "restart" },
  ) {
    return this.systemService.controlSystem(body);
  }

  @Post("start-all")
  @ApiOperation({ summary: "Start all services" })
  async startAll() {
    return this.systemService.controlAll("start");
  }

  @Post("stop-all")
  @ApiOperation({ summary: "Stop all services" })
  async stopAll() {
    return this.systemService.controlAll("stop");
  }

  @Post("restart-all")
  @ApiOperation({ summary: "Restart all services" })
  async restartAll() {
    return this.systemService.controlAll("restart");
  }
}
