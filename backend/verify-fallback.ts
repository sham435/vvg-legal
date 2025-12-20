import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { AiService } from "./src/modules/ai/ai.service";
import { Logger } from "@nestjs/common";

async function verify() {
  const logger = new Logger("FallbackVerify");
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiService = app.get(AiService);

  try {
    logger.log("Testing Script Generation Fallback...");
    const script = await aiService.generateScript("Test Topic");
    if (script.title.includes("Viral Video:")) {
      logger.log("✅ Script Fallback Works: " + script.title);
    } else {
      logger.warn("⚠️ Script generation succeeded unexpectedly? " + script.title);
    }

    logger.log("Testing Image Generation Fallback...");
    const image = await aiService.generateImage("Test Prompt");
    if (image.includes("placehold.co")) {
      logger.log("✅ Image Fallback Works: " + image);
    } else {
      logger.warn("⚠️ Image generation succeeded unexpectedly? " + image);
    }

  } catch (error) {
    logger.error("❌ Verification Failed", error);
    process.exit(1);
  }

  await app.close();
}

verify();
