import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all settings
   */
  async getAllSettings() {
    const settings = await this.prisma.settings.findMany();
    
    const settingsObj: Record<string, any> = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });

    return settingsObj;
  }

  /**
   * Get single setting
   */
  async getSetting(key: string) {
    const setting = await this.prisma.settings.findUnique({
      where: { key },
    });

    return setting?.value || null;
  }

  /**
   * Update setting
   */
  async updateSetting(key: string, value: any) {
    return this.prisma.settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /**
   * Update multiple settings
   */
  async updateMultipleSettings(settings: Record<string, any>) {
    const promises = Object.entries(settings).map(([key, value]) =>
      this.updateSetting(key, value),
    );

    await Promise.all(promises);
    return this.getAllSettings();
  }
}
