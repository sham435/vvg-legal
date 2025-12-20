import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PipelineService } from "../modules/pipeline/pipeline.service";
import { PublishService } from "../modules/publish/publish.service";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("CLI");

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const pipelineService = app.get(PipelineService);
    const publishService = app.get(PublishService);

    const source = process.argv[2] || "Manual/CLI";
    logger.log(`Starting viral video pipeline... (Source: ${source})`);

    // 1. Run generation pipeline
    logger.log("Step 1: generating content...");
    const result = await pipelineService.runPipeline();
    logger.log(
      `Generation complete. Type: ${result.type}, Title: ${result.title}`,
    );

    if (result.type === "video") {
      const videoResult = result; // Type narrowing

      // 2. Publish to platforms
      logger.log("Step 2: publishing video content...");

      // Facebook
      try {
        await publishService.publishToFacebook(
          videoResult.url,
          `${videoResult.title}\n\n${videoResult.description}`,
        );
        logger.log("Published to Facebook");
      } catch (e) {
        logger.error("Failed to publish to Facebook", e.message);
      }

      // Instagram
      try {
        await publishService.publishToInstagram(
          videoResult.url,
          `${videoResult.title}\n\n${videoResult.description}`,
        );
        logger.log("Published to Instagram");
      } catch (e) {
        logger.error("Failed to publish to Instagram", e.message);
      }

      // YouTube
      try {
        if (videoResult.localPath) {
          await publishService.uploadToYouTube(
            videoResult.localPath,
            videoResult.title,
            videoResult.description,
          );
          logger.log("Published to YouTube");
        } else {
             logger.warn("Skipping YouTube upload: No local video path available");
        }
      } catch (e) {
        logger.error("Failed to publish to YouTube", e.message);
      }
    } else {
      // Article Fallback
      logger.log("Step 2: Publishing article content (Fallback)...");
      logger.log(`Article URL: ${result.url}`); // This is the image URL
      logger.log("Skipping video platforms.");
      // Future: Implement publishToMedium or publishToWordpress here
    }

    logger.log("Pipeline finished successfully");
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error("Pipeline failed", error);
    process.exit(1);
  }
}

bootstrap();
