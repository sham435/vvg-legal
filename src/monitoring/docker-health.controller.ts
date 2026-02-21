import { Controller, Get, Query } from "@nestjs/common";

@Controller("monitoring/docker")
export class DockerHealthController {
  @Get()
  getDockerInfo() {
    return {
      containerId: process.env.HOSTNAME || "unknown",
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      railway: {
        serviceId: process.env.RAILWAY_SERVICE_ID,
        environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
        serviceName: process.env.RAILWAY_SERVICE_NAME,
      },
    };
  }

  @Get("logs")
  async getRecentLogs(@Query("lines") lines = 50) {
    // Implement log tailing for Docker
    const logPath =
      process.env.NODE_ENV === "production"
        ? "/var/log/vvg.log"
        : "./logs/vvg.log";

    try {
      // Typically logs are sent to stdout in Docker, so this might check a persisted file
      // if configured, otherwise returning a message.
      const fs = require("fs").promises;
      const logContent = await fs.readFile(logPath, "utf-8");
      const logLines = logContent.split("\n");
      return logLines.slice(-lines).filter(Boolean);
    } catch {
      return {
        message: "Log file not available (logs are streamed to stdout)",
      };
    }
  }
}
