import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";

@ApiTags("Settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("keys")
  @ApiOperation({ summary: "Get all API keys (masked)" })
  async getApiKeys() {
    const keys = await this.settingsService.getApiKeys();
    return {
      success: true,
      data: keys,
    };
  }

  @Post("keys")
  @ApiOperation({ summary: "Update API keys" })
  async updateApiKeys(@Body() body: Record<string, string>) {
    const result = await this.settingsService.updateApiKeys(body);
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all settings" })
  async getAllSettings() {
    const settings = await this.settingsService.getAllSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Get(":key")
  @ApiOperation({ summary: "Get single setting by key" })
  async getSetting(@Param("key") key: string) {
    const value = await this.settingsService.getSetting(key);
    return {
      success: true,
      data: { [key]: value },
    };
  }

  @Post()
  @ApiOperation({ summary: "Update multiple settings" })
  async updateSettings(@Body() settings: Record<string, any>) {
    const updated = await this.settingsService.updateMultipleSettings(settings);
    return {
      success: true,
      data: updated,
    };
  }

  @Post("toggle-service")
  @ApiOperation({ summary: "Toggle service usage" })
  async toggleService(@Body() body: { service: string; enabled: boolean }) {
    const result = await this.settingsService.toggleService(
      body.service,
      body.enabled,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post("test-connection")
  @ApiOperation({ summary: "Test connection to external service" })
  async testConnection(@Body() body: { service: string }) {
    const result = await this.settingsService.testConnection(body.service);
    return {
      success: result.success,
      message: result.message,
    };
  }
}
