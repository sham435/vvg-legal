import { Module, Logger } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { validateEnv, checkRequiredSecrets } from "./config/env.validation";
import { PrismaModule } from "./common/prisma/prisma.module";
import { TrendsModule } from "./modules/trends/trends.module";
import { AiModule } from "./modules/ai/ai.module";
import { VideoModule } from "./modules/video/video.module";
import { ThumbnailModule } from "./modules/thumbnail/thumbnail.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { QueueModule } from "./modules/queue/queue.module";
import { YoutubeModule } from "./modules/youtube/youtube.module";
import { TiktokModule } from "./modules/tiktok/tiktok.module";
import { InstagramModule } from "./modules/instagram/instagram.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { NewsModule } from "./modules/news/news.module";
import { ScriptModule } from "./modules/script/script.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { MusicModule } from "./modules/music/music.module";
import { PublishModule } from "./modules/publish/publish.module";
import { VyroModule } from "./modules/vyro/vyro.module";
import { SystemModule } from "./modules/system/system.module";
import { AppController } from "./app.controller";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { OrchestratorModule } from "./ai/orchestrator/orchestrator.module";
import { GeneticModule } from "./ai/genetic/genetic.module";

@Module({
  controllers: [AppController],
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnv,
      validationSchema: {},
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Rate Limiting - Protect against DDoS and brute force
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 minute
          limit: 10,  // 10 requests per minute per IP
        },
        {
          ttl: 3600000, // 1 hour
          limit: 100,   // 100 requests per hour per IP
        },
      ],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Orchestration
    OrchestratorModule,
    GeneticModule,

    // BullMQ for queue processing
    BullModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST || "localhost";
        const redisPort = parseInt(process.env.REDIS_PORT) || 6379;

        return {
          connection: redisUrl
            ? { url: redisUrl, maxRetriesPerRequest: null }
            : {
                host: redisHost,
                port: redisPort,
                maxRetriesPerRequest: null,
              },
          // Add resilience for startup/CLI tasks
          defaultJobOptions: {
            removeOnComplete: true,
            attempts: 3,
          },
        };
      },
    }),

    /*
    // Serve static frontend assets
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const rootPath = join(__dirname, "..", "..", "..", "frontend", "dist");
        console.log("Static Root Path:", rootPath);
        return [
          {
            rootPath,
            exclude: ["/api/(.*)"],
            serveRoot: "/",
            renderPath: "index.html",
          },
        ];
      },
    }),
    */

    // Database
    PrismaModule,

    // Feature modules
    TrendsModule,
    AiModule,
    VideoModule,
    ThumbnailModule,
    SchedulerModule,
    QueueModule,
    YoutubeModule,
    TiktokModule,
    InstagramModule,
    AuthModule,
    SettingsModule,
    AnalyticsModule,
    NotificationsModule,
    MusicModule,
    VyroModule,
    NewsModule,
    ScriptModule,
    PipelineModule,
    PublishModule,
    SystemModule,
    MarketingModule,
  ],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
