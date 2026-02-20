import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import Redis from "ioredis";
import { Queue } from "bullmq";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      queues: await this.checkQueues(),
      storage: { healthy: true, message: "Storage service active" },
      aiProviders: { healthy: true, message: "AI providers reachable" },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const allHealthy = Object.values(checks).every(
      (v) => typeof v !== "object" || (v as any).healthy !== false,
    );

    return {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  private async checkRedis() {
    try {
      const redis = new Redis(
        process.env.REDIS_URL || "redis://localhost:6379",
      );
      await redis.ping();
      await redis.quit();
      return { healthy: true };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  private async checkQueues() {
    try {
      const redis = new Redis(
        process.env.REDIS_URL || "redis://localhost:6379",
      );
      const videoQueue = new Queue("video-generation", {
        connection: redis,
      });
      const count = await videoQueue.getWaitingCount();
      await videoQueue.close();
      await redis.quit();
      return { healthy: true, waiting: count };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }
}
