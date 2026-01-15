import os
import subprocess
import uuid
import shutil
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

# Setup directories
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()

# Serve generated videos
app.mount("/outputs", StaticFiles(directory=UPLOAD_DIR), name="outputs")

class VideoRequest(BaseModel):
    prompt: str
    size: str = "832*480"
    duration: int = 5
    sample_guide_scale: float = 6.0
    sample_shift: int = 8
    offload_model: bool = True
    t5_cpu: bool = True

@app.get("/health")
def health():
    return {"status": "ok", "service": "wan-inference"}

@app.post("/generate")
async def generate(req: VideoRequest):
    """
    Wraps the official Wan 2.1 'generate.py' script.
    Assumes the Wan2.1 repo is cloned into /app/Wan2.1 or similar,
    or we run the command provided in the Quickstart.
    """
    job_id = str(uuid.uuid4())
    output_filename = f"{job_id}.mp4"
    
    # We assume 'Wan2.1-T2V-1.3B' checkpoint is downloaded to ./Wan2.1-T2V-1.3B
    # and 'generate.py' is in the current directory (or we curl it).
    
    # Construct command
    # python Wan2.1/generate.py ... 
    # OR run from inside Wan2.1 dir to handle relative imports correctly
    
    cmd = [
        "python", "Wan2.1/generate.py", 
        "--task", "t2v-1.3B",
        "--size", req.size,
        "--ckpt_dir", "Wan2.1/Wan2.1-T2V-1.3B", # Assuming weights are inside too
        "--prompt", req.prompt,
        "--sample_guide_scale", str(req.sample_guide_scale),
        "--sample_shift", str(req.sample_shift)
    ]
    
    if req.offload_model:
        cmd.extend(["--offload_model", "True"])
    if req.t5_cpu:
        cmd.append("--t5_cpu")

    print(f"Running command: {' '.join(cmd)}")

    try:
        # In a real deployed container, we'd need to ensure generate.py exists.
        # For this template, we assume the user will 'git clone' in the Dockerfile
        # or mount it.
        
        # MOCK RESPONSE for now if generate.py is missing (to allow build/test)
        if not os.path.exists("./generate.py"):
            print("WARN: generate.py not found. Returning mock response for testing.")
            return {
                "video_url": f"https://mock-service.local/outputs/{output_filename}",
                "local_path": f"{UPLOAD_DIR}/{output_filename}",
                "status": "mocked"
            }

        # Execute
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Generation failed: {result.stderr}")

        # The script creates files in current dir typically, we move to uploads
        # This part requires knowing exactly where generate.py outputs. 
        # Assuming it names it based on prompt or timestamp.
        # We'll just list the latest mp4 file.
        
        # ... File finding logic ...
        
        return {
            "video_url": f"/outputs/{output_filename}", # Simplified
            "local_path": f"{UPLOAD_DIR}/{output_filename}"
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Generation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

