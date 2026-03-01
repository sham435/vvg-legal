import axios from "axios";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config(); // This will look for .env in current working directory

const VEO_API_KEY = process.env.VEO_API_KEY;

async function testVeo() {
  if (!VEO_API_KEY) {
    console.error("VEO_API_KEY not found in .env");
    return;
  }

  const prompt = "A cinematic drone shot of a futuristic neon city at night during rain";
  const model = "veo-3.1-generate-preview"; 
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${VEO_API_KEY}`;

  console.log(`Starting Veo generation for prompt: "${prompt}"...`);

  try {
    const response = await axios.post(
      endpoint,
      {
        instances: [
          {
            prompt: prompt,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const operationName = response.data.name;
    console.log(`Generation started. Operation: ${operationName}`);

    console.log("Polling for completion (this may take several minutes)...");
    
    let videoUrl: string | null = null;
    let done = false;
    let attempts = 0;

    while (!done && attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Poll every 10s
      attempts++;

      const statusResponse = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${VEO_API_KEY}`
      );

      if (statusResponse.data.done) {
        done = true;
        if (statusResponse.data.error) {
          console.error("Generation failed:", statusResponse.data.error.message);
        } else {
          console.log("Full Response:", JSON.stringify(statusResponse.data, null, 2));
          videoUrl = statusResponse.data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
          console.log("Success! Video URL:", videoUrl);
        }
      } else {
        console.log(`...still processing (attempt ${attempts})...`);
      }
    }

    if (!videoUrl) {
      console.log("Generation timed out or failed to return a URL.");
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected Error:", error);
    }
  }
}

testVeo();
