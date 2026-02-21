import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class VideoMetricsService {
  private readonly registry: Registry;

  public readonly videoGenerationDuration: Histogram<string>;
  public readonly videoGenerationTotal: Counter<string>;
  public readonly videoGenerationErrors: Counter<string>;
  public readonly videoCostTotal: Counter<string>;
  public readonly activeGenerations: Gauge<string>;

  constructor() {
    this.registry = new Registry();
    // Collect default system metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    // Define custom metrics
    this.videoGenerationDuration = new Histogram({
      name: "video_generation_duration_seconds",
      help: "Duration of video generation in seconds",
      labelNames: ["engine", "status"],
      buckets: [5, 15, 30, 60, 120, 300, 600], // buckets up to 10 mins
      registers: [this.registry],
    });

    this.videoGenerationTotal = new Counter({
      name: "video_generation_total",
      help: "Total number of video generation requests",
      labelNames: ["engine"],
      registers: [this.registry],
    });

    this.videoGenerationErrors = new Counter({
      name: "video_generation_errors_total",
      help: "Total number of video generation errors",
      labelNames: ["engine", "error_type"],
      registers: [this.registry],
    });

    this.videoCostTotal = new Counter({
      name: "video_cost_total_usd",
      help: "Total estimated cost of video generation in USD",
      labelNames: ["engine"],
      registers: [this.registry],
    });

    this.activeGenerations = new Gauge({
      name: "video_active_generations",
      help: "Number of currently active video generation jobs",
      registers: [this.registry],
    });
  }

  getMetricsContentType(): string {
    return this.registry.contentType;
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  recordGeneration(success: boolean, duration: number) {
    if (success) {
      this.videoGenerationTotal.inc({ engine: "pipeline" });
      this.videoGenerationDuration.observe(
        { engine: "pipeline", status: "success" },
        duration,
      );
    } else {
      this.videoGenerationErrors.inc({
        engine: "pipeline",
        error_type: "execution_failure",
      });
    }
  }
}
