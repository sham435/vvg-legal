import os
import uuid
import gc
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from diffusers import CogVideoXPipeline
from diffusers.utils import load_image, export_to_video

app = FastAPI(title="CogVideoX API")

# Device selection – on Apple Silicon we fall back to CPU
DEVICE = "cpu"
print(f"Initializing CogVideoX on device: {DEVICE}")

# Load the 2B checkpoint (fits in ~5 GB memory)
try:
    pipe = CogVideoXPipeline.from_pretrained(
        "THUDM/CogVideoX-2b",
        torch_dtype=torch.float16,
        variant="fp16",
    )
    # No .to("cuda") – keep on CPU for M4 compatibility
    pipe.enable_attention_slicing("auto")
    pipe.set_progress_bar_config(disable=True)
    gc.collect()
    print("CogVideoX model loaded successfully.")
except Exception as e:
    print(f"Failed to load CogVideoX model: {e}")
    pipe = None

class GenerateRequest(BaseModel):
    image_url: str
    motion_bucket_id: int = 64
    noise_aug_strength: float = 0.02
    seed: int = 42

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": pipe is not None, "device": DEVICE}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    # Optional – you can place a static/favicon.ico in this folder
    return FileResponse("static/favicon.ico")

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <html>
        <head>
            <title>CogVideoX – Video Generation API</title>
            <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
            <h1>CogVideoX – Video Generation API</h1>
            <p>Status: Running</p>
            <p>Endpoints:</p>
            <ul>
                <li>POST /generate - Generate Video</li>
                <li>GET /health - Check Status</li>
            </ul>
        </body>
    </html>
    """

@app.post("/generate")
def generate(req: GenerateRequest):
    if not pipe:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        image = load_image(req.image_url).resize((1024, 576))
        generator = torch.Generator(device=DEVICE).manual_seed(req.seed)
        frames = pipe(
            image,
            num_frames=6,
            num_inference_steps=12,
            motion_bucket_id=req.motion_bucket_id,
            noise_aug_strength=req.noise_aug_strength,
            generator=generator,
        ).frames[0]
        filename = f"cog_{uuid.uuid4()}.mp4"
        output_path = os.path.join("outputs", filename)
        os.makedirs("outputs", exist_ok=True)
        export_to_video(frames, output_path, fps=7)
        return {"video_path": output_path, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve static outputs folder
from fastapi.staticfiles import StaticFiles
os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7861)
