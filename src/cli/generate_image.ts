import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { AiService } from "../modules/ai/ai.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ai = app.get(AiService);
  const prompt = process.argv[2] || "A beautiful sunrise over mountains";
  try {
    const imageUrl = await ai.generateImage(prompt);
    console.log("Generated image URL:", imageUrl);
  } catch (e) {
    console.error("Error generating image:", e);
  }
  await app.close();
}

main();
