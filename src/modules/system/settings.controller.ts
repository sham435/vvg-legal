import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SystemService } from "./system.service";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  @ApiOperation({ summary: "Get current settings" })
  async getSettings() {
    const data = await this.systemService.getSettings();
    return {
      success: true,
      data: data.settings,
      envStatus: data.envStatus,
    };
  }

  @Put()
  @ApiOperation({ summary: "Update settings" })
  async updateSettings(@Body() settings: any) {
    const updated = await this.systemService.updateSettings(settings);
    return {
      success: true,
      data: updated,
    };
  }

  @Post("toggle-service")
  @ApiOperation({ summary: "Toggle a service on/off" })
  async toggleService(@Body() body: { service: string; enabled: boolean }) {
    return this.systemService.toggleService(body.service, body.enabled);
  }

  @Post("test-connection")
  @ApiOperation({ summary: "Test connection for a specific service" })
  async testConnection(@Body() body: { service: string }) {
    return this.systemService.testConnection(body.service);
  }
}
