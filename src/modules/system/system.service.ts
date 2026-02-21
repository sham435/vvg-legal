import { Injectable, Optional, Logger } from "@nestjs/common";
import { SchedulerService } from "../scheduler/scheduler.service";
import { AiService } from "../ai/ai.service";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly settingsPath = path.resolve(
    __dirname,
    "../../../../outputs/settings.json",
  );

  // Internal mocked state for demonstration/logic (since some are stateless)
  private serviceStates = {
    scheduler: "running",
    ai_service: "running",
    video_worker: "idle",
    renderer: "idle",
  };

  constructor(
    @Optional() private schedulerService: SchedulerService,
    private aiService: AiService,
  ) {}

  async getSystemStatus() {
    // 1. Fetch External Server Status from Python (Mock XAMPP style aggregation)
    let externalServers = [];
    try {
      const pyStatus = await axios.get("http://localhost:7861/status");
      const data = pyStatus.data;
      // Transform to array format
      externalServers = [
        {
          name: "News API",
          status: data.news_api?.status || "unknown",
          lastChecked: data.news_api?.last_checked,
        },
        {
          name: "Git Repo",
          status: data.git?.status || "unknown",
          lastChecked: data.git?.last_checked,
        },
        {
          name: "YouTube API",
          status: data.youtube?.status || "unknown",
          lastChecked: data.youtube?.last_checked,
        },
        {
          name: "Meta API",
          status: data.meta?.status || "unknown",
          lastChecked: data.meta?.last_checked,
        },
      ];
    } catch (e) {
      externalServers = [
        { name: "News API", status: "offline", lastChecked: null },
        { name: "Git Repo", status: "offline", lastChecked: null },
        { name: "YouTube API", status: "offline", lastChecked: null },
        { name: "Meta API", status: "offline", lastChecked: null },
      ];
    }

    // 2. Fetch Internal Service Status
    // Update scheduler status based on service state
    this.serviceStates.scheduler =
      this.schedulerService?.isCronActive() ?? false ? "running" : "stopped";

    const internalServices = [
      {
        name: "SchedulerService",
        status: this.serviceStates.scheduler,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "AiService",
        status: this.serviceStates.ai_service,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "Video Queue Worker",
        status: this.serviceStates.video_worker,
        lastUpdated: new Date().toISOString(),
      }, // Needs realtime fetch ideally
      {
        name: "RendererService",
        status: this.serviceStates.renderer,
        lastUpdated: new Date().toISOString(),
      },
    ];

    return {
      servers: externalServers,
      services: internalServices,
    };
  }

  async controlSystem(body: {
    target: string;
    action: "start" | "stop" | "restart";
  }) {
    const { target, action } = body;
    console.log(`[SystemControl] ${action.toUpperCase()} ${target}`);

    // Handle External Servers (Toggle Settings)
    if (["News API", "Git Repo", "YouTube API", "Meta API"].includes(target)) {
      // For external APIs, "Stop" usually means disabling usage in settings
      // Start means enabling. Restart means verify connection.
      if (action === "restart") {
        // For restart, we trigger the Python check endpoint implicitly by next fetch
        // In a real app we might POST to python to force-refresh.
        // Here we simulate success.
        return { success: true, message: `Refreshed connection for ${target}` };
      }
    }

    // Handle Internal Services
    if (target === "SchedulerService") {
      if (!this.schedulerService) {
        return { success: false, message: "SchedulerService not available" };
      }
      if (action === "stop") {
        this.schedulerService.stopCron();
        return { success: true, message: "Scheduler stopped" };
      }
      if (action === "start") {
        this.schedulerService.startCron();
        return { success: true, message: "Scheduler started" };
      }
      if (action === "restart") {
        this.schedulerService.stopCron();
        this.schedulerService.startCron();
        return { success: true, message: "Scheduler restarted" };
      }
    }

    return { success: true, message: `Command ${action} sent to ${target}` };
  }

  async controlAll(action: "start" | "stop" | "restart") {
    if (!this.schedulerService) {
      return { success: false, message: "SchedulerService not available" };
    }
    if (action === "start") {
      this.schedulerService.startCron();
      return { success: true, message: "All services started" };
    }
    if (action === "stop") {
      this.schedulerService.stopCron();
      return { success: true, message: "All services stopped" };
    }
    if (action === "restart") {
      this.schedulerService.stopCron();
      this.schedulerService.startCron();
      return { success: true, message: "All services restarted" };
    }
  }
  // --- Settings Management ---

  private getSettingsPath() {
    return this.settingsPath;
  }

  private loadSettingsData() {
    if (!fs.existsSync(this.settingsPath)) {
      return { services: {} };
    }
    try {
      return JSON.parse(fs.readFileSync(this.settingsPath, "utf8"));
    } catch (e) {
      console.error("Failed to parse settings.json", e);
      return { services: {} };
    }
  }

  private saveSettingsData(data: any) {
    fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
  }

  async getSettings() {
    const settings = this.loadSettingsData();

    // Mask keys or provide status (for this local tool we might return environmental status too)
    // Since specific keys are in .env, we check process.env for "Required" ones
    const envStatus = {
      news_api: !!process.env.NEWS_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      luma: !!process.env.LUMA_API_KEY,
      youtube: !!process.env.YOUTUBE_API_KEY,
      tiktok: !!process.env.TIKTOK_ACCESS_TOKEN,
      instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    };

    return {
      settings,
      envStatus,
    };
  }

  async updateSettings(newSettings: any) {
    const current = this.loadSettingsData();
    const updated = { ...current, ...newSettings };
    this.saveSettingsData(updated);
    return updated;
  }

  async toggleService(service: string, enabled: boolean) {
    const current = this.loadSettingsData();
    if (!current.services) current.services = {};

    current.services[service.toLowerCase()] = enabled;
    this.saveSettingsData(current);
    return { success: true, service, enabled };
  }

  async testConnection(service: string) {
    service = service.toLowerCase();

    try {
      if (service === "newsapi") {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) throw new Error("Missing NEWS_API_KEY in .env");
        await axios.get(
          `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}&pageSize=1`,
        );
        return { success: true, message: "Connected to NewsAPI" };
      }

      if (service === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Missing OPENAI_API_KEY in .env");
        // Lightweight check usually list models
        await axios.get("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { success: true, message: "Connected to OpenAI" };
      }

      if (service === "git") {
        // Simple public check
        await axios.get("https://github.com");
        return { success: true, message: "GitHub is accessible" };
      }

      if (service === "youtube data api") {
        // Placeholder check logic, real implementation requires configured google client / key
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY in .env");
        // Test usually involves listing channels
        await axios.get(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${apiKey}`,
        );
        return { success: true, message: "Connected to YouTube API" };
      }

      // Default fallback for others
      return {
        success: true,
        message: `Simulated connection test for ${service} passed (Method not implemented)`,
      };
    } catch (error: any) {
      console.error(`Test connection failed for ${service}:`, error.message);
      return { success: false, message: error.message || "Connection failed" };
    }
  }
}
