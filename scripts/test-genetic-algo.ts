import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.ts';
import { EvolutionEngine } from '../src/ai/genetic/evolution-engine.ts';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const evolutionEngine = app.get(EvolutionEngine);

  const topic = process.argv[2] || "The Future of AI";
  console.log(`🧬 Starting Genetic Evolution for topic: "${topic}"`);

  try {
    const superViralScript = await evolutionEngine.evolveScript(topic, 3, 4);
    
    console.log("\n🚀 SUPER VIRAL SCRIPT EVOLVED 🚀");
    console.log("===================================");
    console.log(`Title: ${superViralScript.title}`);
    console.log(`Hook: ${superViralScript.hook}`);
    console.log(`Duration: ${superViralScript.totalDuration}s`);
    console.log("Scenes:");
    superViralScript.scenes.forEach(s => {
        console.log(`- [${s.duration}s] ${s.description} (Narration: "${s.narration.substring(0, 50)}...")`);
    });
    console.log("===================================");

  } catch (error) {
    console.error("Evolution failed:", error);
  }

  await app.close();
}

bootstrap();
