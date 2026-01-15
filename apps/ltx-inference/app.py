import os
import subprocess
import uuid
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

# Setup directories
UPLOAD_DIR = "/app/uploads"
OUTPUT_DIR = "/app/outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(title="LTX-Video Inference Service")

# Serve generated videos
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

class VideoRequest(BaseModel):
    prompt: str
    height: int = 480  # Must be divisible by 32
    width: int = 832   # Must be divisible by 32
    num_frames: int = 97  # Must be divisible by 8 + 1 (e.g., 17, 33, 65, 97, 129, 161, 193, 225, 257)
    pipeline_config: str = "configs/ltxv-13b-0.9.8-distilled.yaml"
    seed: Optional[int] = None
    input_image_path: Optional[str] = None  # For image-to-video
    negative_prompt: Optional[str] = "worst quality, inconsistent motion, blurry, jittery, distorted"

class HealthResponse(BaseModel):
    status: str
    service: str

@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "service": "ltx-inference"}

def validate_resolution(height: int, width: int) -> tuple[int, int]:
    """Ensure resolution is divisible by 32"""
    height = height - (height % 32)
    width = width - (width % 32)
    return height, width

def validate_frames(num_frames: int) -> int:
    """Ensure frames are divisible by 8 + 1"""
    if num_frames < 17:
        return 17
    if num_frames > 257:
        return 257
    # Round to nearest valid frame count
    remainder = (num_frames - 1) % 8
    if remainder == 0:
        return num_frames
    # Round down to nearest valid
    return ((num_frames - 1) // 8) * 8 + 1

@app.post("/generate")
async def generate(req: VideoRequest):
    """
    Generate video using LTX-Video.
    
    Supports both text-to-video and image-to-video generation.
    Uses the inference.py script from LTX-Video repository.
    """
    job_id = str(uuid.uuid4())
    output_filename = f"{job_id}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    # Validate and adjust resolution
    height, width = validate_resolution(req.height, req.width)
    
    # Validate and adjust frame count
    num_frames = validate_frames(req.num_frames)
    
    # Construct command for inference.py
    # Assuming LTX-Video repo is cloned to /app/LTX-Video
    cmd = [
        "python", "LTX-Video/inference.py",
        "--prompt", req.prompt,
        "--height", str(height),
        "--width", str(width),
        "--num_frames", str(num_frames),
        "--pipeline_config", req.pipeline_config,
    ]
    
    if req.seed is not None:
        cmd.extend(["--seed", str(req.seed)])
    
    if req.input_image_path:
        cmd.extend(["--input_image_path", req.input_image_path])
    
    # Set output path if inference.py supports it
    # Note: inference.py may output to a default location, we'll handle that below
    
    print(f"Running LTX-Video command: {' '.join(cmd)}")
    print(f"Validated resolution: {width}x{height}, frames: {num_frames}")

    try:
        # Check if inference.py exists
        inference_script = "LTX-Video/inference.py"
        if not os.path.exists(inference_script):
            print("WARN: inference.py not found. Returning mock response for testing.")
            return {
                "video_url": f"/outputs/{output_filename}",
                "local_path": output_path,
                "output_path": output_path,
                "status": "mocked",
                "resolution": f"{width}x{height}",
                "frames": num_frames
            }

        # Execute inference
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 min timeout
            cwd="/app"  # Run from app directory
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"LTX-Video generation failed: {result.stderr}"
            )

        # Find the generated video file
        # inference.py typically outputs to a timestamped or prompt-based filename
        # We'll look for the most recent .mp4 file in the output directory or current directory
        output_files = []
        for root, dirs, files in os.walk("/app"):
            for file in files:
                if file.endswith(".mp4"):
                    file_path = os.path.join(root, file)
                    output_files.append((os.path.getmtime(file_path), file_path))
        
        if output_files:
            # Get most recent file
            latest_file = max(output_files, key=lambda x: x[0])[1]
            # Move to our output directory
            shutil.move(latest_file, output_path)
        else:
            # If no file found, return the expected path (may need manual handling)
            print(f"WARN: No output file found, using expected path: {output_path}")

        return {
            "video_url": f"/outputs/{output_filename}",
            "local_path": output_path,
            "output_path": output_path,
            "status": "success",
            "resolution": f"{width}x{height}",
            "frames": num_frames
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="LTX-Video generation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-from-image")
async def generate_from_image(
    prompt: str,
    file: UploadFile = File(...),
    height: int = 480,
    width: int = 832,
    num_frames: int = 97,
    pipeline_config: str = "configs/ltxv-13b-0.9.8-distilled.yaml",
    seed: Optional[int] = None
):
    """
    Generate video from uploaded image (image-to-video).
    """
    # Save uploaded image
    image_id = str(uuid.uuid4())
    image_ext = os.path.splitext(file.filename)[1] or ".jpg"
    image_path = os.path.join(UPLOAD_DIR, f"{image_id}{image_ext}")
    
    with open(image_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create request and call generate
    req = VideoRequest(
        prompt=prompt,
        height=height,
        width=width,
        num_frames=num_frames,
        pipeline_config=pipeline_config,
        seed=seed,
        input_image_path=image_path
    )
    
    return await generate(req)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
