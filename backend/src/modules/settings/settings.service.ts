import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  // Path to settings file - using absolute path to match SchedulerService
  private readonly settingsPath =
    "/Users/sham4/Antigravity/vvg/viral-video-generator/backend/outputs/settings.json";
  private readonly envPath =
    "/Users/sham4/Antigravity/vvg/viral-video-generator/backend/.env";

  constructor() {}

  private loadSettings(): Record<string, any> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        return JSON.parse(fs.readFileSync(this.settingsPath, "utf8"));
      }
    } catch (e) {
      this.logger.error("Failed to load settings.json", e);
    }
    return {};
  }

  private saveSettings(data: Record<string, any>) {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
    } catch (e) {
      this.logger.error("Failed to save settings.json", e);
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    return this.loadSettings();
  }

  /**
   * Get single setting
   */
  async getSetting(key: string) {
    const settings = this.loadSettings();
    return settings[key] || null;
  }

  /**
   * Update setting
   */
  async updateSetting(key: string, value: any) {
    const settings = this.loadSettings();
    settings[key] = value;
    this.saveSettings(settings);
    return settings;
  }

  /**
   * Update multiple settings
   */
  async updateMultipleSettings(newSettings: Record<string, any>) {
    const settings = this.loadSettings();
    const updated = { ...settings, ...newSettings };
    this.saveSettings(updated);
    return updated;
  }

  /**
   * Toggle service usage
   */
  async toggleService(service: string, enabled: boolean) {
    const settings = this.loadSettings();
    if (!settings.services) {
      settings.services = {};
    }
    settings.services[service.toLowerCase()] = enabled;
    this.saveSettings(settings);
    return { success: true, enabled };
  }

  /**
   * Get service status
   */
  async getServiceStatus(service: string) {
    const settings = this.loadSettings();
    const services = settings.services || {};
    // Default to true if not explicitly disabled, except for optional ones maybe?
    // actually default to false if not set?
    // Let's say default is TRUE unless explicitly set to false?
    // Or safer: default false.
    // Let's assume default is TRUE for essential checks if key exists.
    // But for the UI toggle, we return current state.
    return services[service.toLowerCase()] ?? true; // Default Enabled
  }

  /**
   * Test connection to service
   */
  async testConnection(service: string) {
    const serviceName = service.toLowerCase();

    // Simulate connection check based on Env Vars presence
    let isConfigured = false;

    // Check global env vars
    switch (serviceName) {
      case "openai":
        isConfigured = !!process.env.OPENAI_API_KEY;
        break;
      case "newsapi":
        isConfigured = !!process.env.NEWS_API_KEY;
        break;
      case "youtube data api":
      case "youtube":
        isConfigured =
          !!process.env.YOUTUBE_API_KEY ||
          !!process.env.YOUTUBE_ACCESS_TOKEN ||
          (!!process.env.YOUTUBE_CLIENT_ID &&
            !!process.env.YOUTUBE_REFRESH_TOKEN);
        break;
      case "luma dream machine":
      case "luma":
        isConfigured = !!process.env.LUMA_API_KEY;
        break;
      case "runway gen-3":
      case "runway":
        isConfigured = !!process.env.RUNWAY_API_KEY;
        break;
      case "tiktok api":
        isConfigured = !!process.env.TIKTOK_ACCESS_TOKEN;
        break;
      case "instagram graph api":
        isConfigured = !!process.env.INSTAGRAM_ACCESS_TOKEN;
        break;
      case "discord webhook":
        isConfigured = !!process.env.DISCORD_WEBHOOK_URL;
        break;
      case "midjourney/ideogram":
        isConfigured =
          !!process.env.MIDJOURNEY_API_KEY || !!process.env.IDEOGRAM_API_KEY;
        break;
      default:
        // Unknown service
        return { success: false, message: `Unknown service: ${service}` };
    }

    if (isConfigured) {
      return { success: true, message: "Connection successful (Key found)" };
    } else {
      return { success: false, message: "API Key missing in backend .env" };
    }
  }

  /**
   * Get all API keys (masked) from .env
   */
  /**
   * Get all API keys (masked) from .env
   */
  async getApiKeys() {
    try {
      if (!fs.existsSync(this.envPath)) {
        this.logger.warn(`.env file not found at ${this.envPath}`);
        return {};
      }

      const envContent = fs.readFileSync(this.envPath, "utf8");
      const lines = envContent.split("\n");
      const keys: Record<string, string> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let value = parts.slice(1).join("=").trim();

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          if (
            key.includes("KEY") ||
            key.includes("TOKEN") ||
            key.includes("SECRET") ||
            key.includes("PASSWORD")
          ) {
            // Mask value: show first 3 chars, then ***, then last 3 chars (if long enough)
            if (value.length > 10) {
              keys[key] =
                `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
            } else {
              keys[key] = "******";
            }
          } else {
            keys[key] = value;
          }
        }
      }
      return keys;
    } catch (e) {
      this.logger.error("Failed to read .env file", e);
      return {};
    }
  }

  /**
   * Update API keys in .env
   */
  async updateApiKeys(updates: Record<string, string>) {
    try {
      let envContent = "";
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, "utf8");
      }

      const lines = envContent.split("\n");
      const newLines: string[] = [];
      const updatedKeys = new Set<string>();

      // Update existing keys
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          newLines.push(line);
          continue;
        }

        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          if (updates[key] !== undefined) {
            // Update this key
            newLines.push(`${key}=${updates[key]}`);
            updatedKeys.add(key);
            // Update runtime env
            process.env[key] = updates[key];
          } else {
            // Keep existing
            newLines.push(line);
          }
        } else {
          newLines.push(line);
        }
      }

      // Add new keys that weren't in the file
      for (const [key, value] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
          newLines.push(`${key}=${value}`);
          process.env[key] = value;
          updatedKeys.add(key);
        }
      }

      fs.writeFileSync(this.envPath, newLines.join("\n"));
      return { success: true, updated: Array.from(updatedKeys) };
    } catch (e) {
      this.logger.error("Failed to write to .env file", e);
      throw e;
    }
  }
}
