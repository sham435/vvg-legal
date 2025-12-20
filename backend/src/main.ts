import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { SpaFallbackFilter } from "./common/filters/spa-fallback.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  //  // Global API Prefix
  app.setGlobalPrefix("api"); // All routes start with /api

  // Enable CORS
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
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
  await app.listen(port);
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`📚 API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
