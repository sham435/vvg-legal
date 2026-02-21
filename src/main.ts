import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { SpaFallbackFilter } from "./common/filters/spa-fallback.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Compression - Gzip responses
  app.use(compression());

  // Security Headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow for some flexibility
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Healthcheck endpoint for Railway
  app.getHttpAdapter().get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API Prefix
  app.setGlobalPrefix("api/v1", {
    exclude: [
      "/",
      "terms",
      "privacy",
      "tiktokGTu6guA6BWbvFlR9iChxomYvIBo6ZS4Y.txt",
      "health",
    ],
  });

  // CORS - Production-safe configuration
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"];

  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });

  // SPA Fallback for non-API routes
  app.useGlobalFilters(new SpaFallbackFilter());

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle("Viral Video Automation API")
    .setDescription("API for automated viral video generation and publishing")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0");
  logger.log(`🚀 Backend running on: http://localhost:${port}`);
  logger.log(`📚 API Docs available at: http://localhost:${port}/api/v1/docs`);
  logger.log(`🔒 Security headers enabled (Helmet)`);
  logger.log(`⚡ Compression enabled`);
  logger.log(`🛡️ Rate limiting enabled`);
}

bootstrap();
