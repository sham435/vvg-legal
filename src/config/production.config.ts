export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,

  database: {
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },

  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.NODE_ENV === "production" ? {} : undefined,
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },

  queue: {
    name: process.env.QUEUE_NAME || "video-generation",
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 3,
    limiter: {
      max: parseInt(process.env.QUEUE_LIMITER_MAX, 10) || 5,
      duration: parseInt(process.env.QUEUE_LIMITER_DURATION, 10) || 1000,
    },
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 100, // Keep last 100 failed jobs
      attempts: 3, // Retry failed jobs 3 times
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["https://yourdomain.com"],
    credentials: true,
  },

  video: {
    engines: process.env.VIDEO_ENGINE_PRIORITY?.split(",") || ["veo", "cosmos"],
    timeout: 300000,
    maxRetries: 3,
  },
});
