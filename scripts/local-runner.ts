// scripts/local-runner.ts
import { Worker, Job } from 'bullmq';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
dotenv.config();

/** ---------------------------------------------------------------
 * Configuration – all driven by environment variables
 * --------------------------------------------------------------- */
const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
// Example: "local,luma_cloud,runway_cloud,colab,batch,placeholder"
const ENGINE_PRIORITY = (
  process.env.VIDEO_ENGINE_PRIORITY?.split(',') ?? ['placeholder']
).map(e => e.trim());
const ALLOW_PAID = process.env.ALLOW_PAID === 'true';
const PLACEHOLDER_URL =
  process.env.PLACEHOLDER_URL ??
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/** ---------------------------------------------------------------
 * Helper – map local engine name → container endpoint
 * --------------------------------------------------------------- */
const LOCAL_ENGINE_ENDPOINTS: Record<string, string> = {
  luma: 'http://localhost:8000/generate',
  runway: 'http://localhost:8001/generate',
  cogvideox: 'http://localhost:8002/generate',
  svd: 'http://localhost:8003/generate',
};

/**
 * Hunyuan-specific configuration
 */
const HUNYUAN_GENERATE_SCRIPT = process.env.HUNYUAN_GENERATE_SCRIPT ?? 'generate.py';
const HUNYUAN_MODEL_PATH = process.env.HUNYUAN_MODEL_PATH ?? '';
const POKELORA_PATH = process.env.POKELORA_PATH ?? 'PokeLoRA.safetensors';
const PYTHON_PATH = process.env.PYTHON_PATH ?? 'python';
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? 'outputs';

/** ---------------------------------------------------------------
 * Helper – map cloud engine identifier → remote endpoint URL
 * (set via env vars like LUMA_CLOUD_URL, RUNWAY_CLOUD_URL, etc.)
 * --------------------------------------------------------------- */
const CLOUD_ENGINE_ENDPOINTS: Record<string, string> = {
  luma: process.env.LUMA_CLOUD_URL ?? '',
  runway: process.env.RUNWAY_CLOUD_URL ?? '',
  cogvideox: process.env.COGVIDEON_CLOUD_URL ?? '',
  svd: process.env.SVD_CLOUD_URL ?? '',
};

/** ---------------------------------------------------------------
 * Call a local Docker container
 * --------------------------------------------------------------- */
async function callLocalEngine(
  engine: string,
  prompt: string,
  duration: number,
): Promise<string | undefined> {
  const url = LOCAL_ENGINE_ENDPOINTS[engine];
  if (!url) return undefined;
  try {
    const resp = await axios.post(url, { prompt, duration });
    return resp.data.videoUrl;
  } catch (e) {
    console.warn(`⚠️  Local ${engine} failed: ${(e as Error).message}`);
    return undefined;
  }
}

/** ---------------------------------------------------------------
 * Call a paid cloud GPU endpoint (if allowed)
 * --------------------------------------------------------------- */
async function callCloudEngine(
  engine: string,
  prompt: string,
  duration: number,
): Promise<string | undefined> {
  if (!ALLOW_PAID) return undefined;
  const url = CLOUD_ENGINE_ENDPOINTS[engine];
  if (!url) return undefined;
  try {
    const resp = await axios.post(url, { prompt, duration });
    return resp.data.videoUrl;
  } catch (e) {
    console.warn(`☁️  Cloud ${engine} failed: ${(e as Error).message}`);
    return undefined;
  }
}

/** ---------------------------------------------------------------
 * Call a Colab notebook wrapper (free, but manual start)
 * The notebook should expose an HTTP endpoint reachable via
 * COLAB_ENDPOINT env var. Payload format matches local engines.
 * --------------------------------------------------------------- */
async function callColabEngine(
  prompt: string,
  duration: number,
): Promise<string | undefined> {
  const url = process.env.COLAB_ENDPOINT;
  if (!url) return undefined;
  try {
    const resp = await axios.post(url, { prompt, duration });
    return resp.data.videoUrl;
  } catch (e) {
    console.warn(`🧪  Colab engine failed: ${(e as Error).message}`);
    return undefined;
  }
}

/** ---------------------------------------------------------------
 * Enqueue an offline batch job (e.g., write to a CSV that you
 * later process manually). Returns a placeholder URL for now.
 * --------------------------------------------------------------- */
async function enqueueOfflineBatch(
  prompt: string,
  duration: number,
): Promise<string | undefined> {
  // Simple implementation: write a JSON line to a local file.
  // In a real system you could push to a separate queue or storage.
  const fs = await import('fs');
  const line = JSON.stringify({ prompt, duration, ts: Date.now() }) + '\n';
  try {
    fs.appendFileSync('offline_batch_jobs.jsonl', line);
    console.log('🗂️  Added job to offline_batch_jobs.jsonl');
    return PLACEHOLDER_URL; // immediate placeholder while batch runs later
  } catch (e) {
    console.warn('❌  Failed to write offline batch job');
    return undefined;
  }
}

/** ---------------------------------------------------------------
 * Call local HunyuanVideo (PokeLoRA) via python generate.py
 * --------------------------------------------------------------- */
async function callHunyuanEngine(
  prompt: string,
  duration: number,
): Promise<string | undefined> {
  // 1. We need a reference image for i2v. For now, we'll try to find one
  // or use a placeholder if the caller didn't provide one.
  // In a real flow, you'd likely generate this with DALL-E first.
  const imagePath = process.env.HUNYUAN_REF_IMAGE_PATH ?? 'ref.jpg';
  const outPath = `${OUTPUT_DIR}/hunyuan_${Date.now()}.mp4`;

  console.log(`🎬  Launching HunyuanVideo for prompt: ${prompt}`);

  const args = [
    HUNYUAN_GENERATE_SCRIPT,
    '--prompt', prompt,
    '--image_path', imagePath,
    '--resolution', '480p',
    '--model_path', HUNYUAN_MODEL_PATH,
    '--lora_path', POKELORA_PATH,
    '--guidance_scale', '1',
    '--lora_scale', '0.5',
    '--output_path', outPath, // Assuming the script accepts this or we rename later
  ];

  return new Promise((resolve) => {
    const py = spawn(PYTHON_PATH, args);

    py.stdout.on('data', (data) => console.log(`[Hunyuan] ${data}`));
    py.stderr.on('data', (data) => console.error(`[Hunyuan Error] ${data}`));

    py.on('close', (code) => {
      if (code === 0) {
        // Return the local path or a URL if we upload it
        // For simplicity, we return the path which the backend should handle
        resolve(outPath);
      } else {
        console.error(`❌  Hunyuan process exited with code ${code}`);
        resolve(undefined);
      }
    });
  });
}

/** ---------------------------------------------------------------
 * Return the free placeholder video URL
 * --------------------------------------------------------------- */
function getPlaceholder(): string {
  return PLACEHOLDER_URL;
}

/** ---------------------------------------------------------------
 * Report success back to the NestJS backend – updates the DB
 * --------------------------------------------------------------- */
async function reportSuccess(
  jobId: string | number,
  videoUrl: string,
  engineUsed: string,
) {
  try {
    await axios.patch(`${BACKEND_URL}/api/videos/${jobId}`, {
      videoUrl,
      engine: engineUsed,
    });
    console.log(`📦  Backend updated for job ${jobId} (engine=${engineUsed})`);
  } catch (e) {
    console.error(
      `❌  Failed to update backend for job ${jobId}: ${(e as Error).message}`,
    );
  }
}

/** ---------------------------------------------------------------
 * The worker – processes jobs from the "video-generation" queue
 * --------------------------------------------------------------- */
const worker = new Worker(
  'video-generation',
  async (job: Job) => {
    const { prompt, duration, priority } = job.data as {
      prompt: string;
      duration: number;
      priority?: string[]; // optional per‑job override
    };
    const engines = priority?.length ? priority : ENGINE_PRIORITY;
    console.log(`🛠️  Job ${job.id} – engines: ${engines.join(' → ')}`);

    for (const engine of engines) {
      let videoUrl: string | undefined;
      switch (engine) {
        case 'local':
          // try each local engine in its own priority order
          for (const le of ['luma', 'runway', 'cogvideox', 'svd', 'hunyuan']) {
            if (le === 'hunyuan') {
              videoUrl = await callHunyuanEngine(prompt, duration);
            } else {
              videoUrl = await callLocalEngine(le, prompt, duration);
            }
            if (videoUrl) {
              await reportSuccess(job.id!, videoUrl, `local_${le}`);
              return;
            }
          }
          break;
        case 'luma_cloud':
        case 'runway_cloud':
        case 'cogvideox_cloud':
        case 'svd_cloud':
          const base = engine.replace('_cloud', '');
          videoUrl = await callCloudEngine(base, prompt, duration);
          if (videoUrl) {
            await reportSuccess(job.id!, videoUrl, engine);
            return;
          }
          break;
        case 'colab':
          videoUrl = await callColabEngine(prompt, duration);
          if (videoUrl) {
            await reportSuccess(job.id!, videoUrl, 'colab');
            return;
          }
          break;
        case 'batch':
          videoUrl = await enqueueOfflineBatch(prompt, duration);
          if (videoUrl) {
            await reportSuccess(job.id!, videoUrl, 'batch');
            return;
          }
          break;
        case 'placeholder':
          videoUrl = getPlaceholder();
          await reportSuccess(job.id!, videoUrl, 'placeholder');
          return;
        default:
          console.warn(`⚠️  Unknown engine identifier: ${engine}`);
      }
      if (videoUrl) {
        // success already handled inside each case
        break;
      } else {
        console.warn(`⚠️  Engine ${engine} failed, trying next`);
      }
    }
  },
  {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
    concurrency: Number(process.env.LOCAL_RUNNER_CONCURRENCY ?? 1),
  },
);

worker.on('completed', job => {
  console.log(`✅  Job ${job.id} completed`);
});
worker.on('failed', (job, err) => {
  console.error(`❌  Job ${job?.id} failed: ${err?.message}`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑  Shutting down worker...');
  await worker.close();
  process.exit(0);
});
