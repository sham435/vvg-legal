import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  async getAllSettings() {
    const settings = await this.settingsService.getAllSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get single setting by key' })
  async getSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(key);
    return {
      success: true,
      data: { [key]: value },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Update multiple settings' })
  async updateSettings(@Body() settings: Record<string, any>) {
    const updated = await this.settingsService.updateMultipleSettings(settings);
    return {
      success: true,
      data: updated,
    };
  }
}
