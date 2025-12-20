import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set in .env");
  process.exit(1);
}

async function generateImage(prompt: string) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );
    const imageUrl = response.data.data[0].url;
    console.log("Generated image URL:", imageUrl);
    // Optionally download the image
    const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const outPath = path.resolve(__dirname, "../../generated_images");
    if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
    const filePath = path.join(outPath, `image_${Date.now()}.png`);
    fs.writeFileSync(filePath, imgResp.data);
    console.log("Image saved to", filePath);
  } catch (err) {
    console.error("Error generating image:", err.response?.data || err.message);
  }
}

const prompt = process.argv[2] || "A beautiful sunrise over mountains";
generateImage(prompt);
