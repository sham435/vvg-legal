import os
import uuid
import gc
import torch
import time  # Added for thermal throttling
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from diffusers import CogVideoXPipeline
from diffusers.utils import load_image, export_to_video
import datetime # Added for timestamps
import json
from threading import Lock
from typing import List, Optional
import requests # Added for service checks

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CogVideoX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Service Status Monitoring ---
STATUS = {
    "news_api": {"status": "unknown", "last_checked": None},
    "git": {"status": "unknown", "last_checked": None},
    "youtube": {"status": "unknown", "last_checked": None},
    "meta": {"status": "unknown", "last_checked": None},
}

def check_news_api():
    try:
        # Placeholder key/url as provided in prompt
        r = requests.get("https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_KEY", timeout=5)
        # We expect 401 (unauthorized) or 200, but if we get a response it's "online" effectively vs "offline" connection error
        # For strictness:
        STATUS["news_api"]["status"] = "online" if r.status_code in [200, 401] else "error"
    except:
        STATUS["news_api"]["status"] = "offline"
    STATUS["news_api"]["last_checked"] = datetime.datetime.now().isoformat()

    try:
        # Check public site availability with User-Agent to avoid bot blocking
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        r = requests.get("https://github.com", headers=headers, timeout=5)
        
        if r.status_code < 400:
             STATUS["git"]["status"] = "online"
        else:
             print(f"Git Check Failed: {r.status_code}")
             STATUS["git"]["status"] = "error"
    except Exception as e:
        print(f"Git Check internal error: {e}")
        STATUS["git"]["status"] = "offline"
    STATUS["git"]["last_checked"] = datetime.datetime.now().isoformat()

def check_youtube_channel():
    try:
        # Placeholder
        r = requests.get("https://www.googleapis.com/youtube/v3/channels?part=snippet&id=CHANNEL_ID&key=YOUR_KEY", timeout=5)
        STATUS["youtube"]["status"] = "online" if r.status_code in [200, 400, 403] else "error"
    except:
        STATUS["youtube"]["status"] = "offline"
    STATUS["youtube"]["last_checked"] = datetime.datetime.now().isoformat()

def check_meta_platform():
    try:
        r = requests.get("https://graph.facebook.com/v17.0/me?access_token=YOUR_TOKEN", timeout=5)
        STATUS["meta"]["status"] = "online" if r.status_code in [200, 400, 401] else "error"
    except:
        STATUS["meta"]["status"] = "offline"
    STATUS["meta"]["last_checked"] = datetime.datetime.now().isoformat()

@app.get("/status")
def get_service_status():
    # Trigger checks on read for freshness (or could be background)
    # For now, let's trigger them here to ensure data is populated
    check_news_api()
    check_git_repo()
    check_youtube_channel()
    check_meta_platform()
    return STATUS

# --- Persistence Layer ---
VIDEO_DB_PATH = os.path.join("..", "outputs", "videos.json")
db_lock = Lock()

def load_videos():
    if not os.path.exists(VIDEO_DB_PATH):
        return []
    with open(VIDEO_DB_PATH, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_video_entry(entry):
    with db_lock:
        videos = load_videos()
        # Avoid duplicates if checking by ID, but for now just prepend
        videos.insert(0, entry)
        with open(VIDEO_DB_PATH, "w") as f:
            json.dump(videos, f, indent=2)

def update_video_status(filename: str, status: str, error: Optional[str] = None):
    with db_lock:
        videos = load_videos()
        updated = False
        for v in videos:
            if v.get("filename") == filename:
                v["status"] = status
                if error:
                    v["error"] = error
                updated = True
                break
        if updated:
            with open(VIDEO_DB_PATH, "w") as f:
                json.dump(videos, f, indent=2)

def delete_video_entry(filename: str):
    with db_lock:
        videos = load_videos()
        initial_len = len(videos)
        videos = [v for v in videos if v.get("filename") != filename]
        if len(videos) != initial_len:
            with open(VIDEO_DB_PATH, "w") as f:
                json.dump(videos, f, indent=2)


# Global Progress State
PROGRESS_STATE = {
    "status": "idle",
    "current_step": 0,
    "total_steps": 0,
    "percentage": 0
}

# --- MPS Verification & Setup ---
print(f"[{datetime.datetime.now()}] Verifying Hardware Acceleration...")
if not torch.backends.mps.is_available():
    print("❌ MPS not available! CPU fallback would be too slow. Exiting.")
    sys.exit(1)

if not torch.backends.mps.is_built():
    print("❌ PyTorch not built with MPS support! Exiting.")
    sys.exit(1)

print("✅ MPS Backend Available.")
print("✅ MPS Backend Built.")

DEVICE = "mps"
torch.set_default_dtype(torch.float32) # Global guard against float64 on MPS
# torch.set_default_device(DEVICE) # REMOVED: Causes float64 errors on MPS

print(f"[{datetime.datetime.now()}] Initializing CogVideoX on DEVICE: {DEVICE} (Forced)")

# Initialize Pipeline
pipe = None
try:
    # Model Path Handling
    # User requested local directory structure: ./models/cogvideox-2b
    local_model_path = "models/cogvideox-2b"
    model_id = "THUDM/CogVideoX-2b"
    
    if os.path.exists(local_model_path) and os.path.isdir(local_model_path):
        print(f"[{datetime.datetime.now()}] Loading from local directory: {local_model_path}")
        model_source = local_model_path
    else:
        print(f"[{datetime.datetime.now()}] Local directory not found. Loading from Cache: {model_id}")
        model_source = model_id

    # Load model with float16 to save memory (Crucial for 20GB RAM)
    pipe = CogVideoXPipeline.from_pretrained(
        model_source,
        torch_dtype=torch.float16,
        local_files_only=True # Assumes weights are downloaded
    )
    
    # Confirm device placement
    print(f"[{datetime.datetime.now()}] Pipeline loaded. Validating device placement...")
    # enable_model_cpu_offload requires 'accelerate' and handles moving parts to MPS/CPU as needed
    # This is safer than pipe.to("mps") for limited RAM, but pipe.to("mps") is faster if it fits.
    # CogVideoX-2B (fp16) is ~4GB. 20GB RAM is plenty. We will force full MPS for speed.
    
    # SANITIZE: Force all parameters and buffers to float32 if they are float64 (T5/LayerNorm fix)
    # This prevents "Cannot convert a MPS Tensor to float64" crash
    components = [pipe.transformer, pipe.vae]
    if hasattr(pipe, "text_encoder") and pipe.text_encoder is not None:
        components.append(pipe.text_encoder)
        
    for component in components:
        # Scrub Parameters
        for name, param in component.named_parameters():
            if param.dtype == torch.float64:
                param.data = param.data.to(torch.float32)
        # Scrub Buffers (Critical for LayerNorm, running stats, etc.)
        for name, buf in component.named_buffers():
            if buf.dtype == torch.float64:
                buf.data = buf.data.to(torch.float32)

    # pipe.to(DEVICE) # REMOVED: Full load causes OOM on 20GB.
    # Use CPU Offload (requires accelerate)
    pipe.enable_model_cpu_offload(device=DEVICE)
    print(f"✅ Model loaded with CPU Offload on {DEVICE}")

    # Optional optimizations
    pipe.enable_attention_slicing() # Enable to save memory (Crucial for MPS)
    pipe.set_progress_bar_config(disable=True) # Keep this line for disabling progress bar
    
    print(f"CogVideoX model loaded successfully on {DEVICE}.")
except Exception as e:
    print(f"Failed to load CogVideoX model: {e}")
    pipe = None

class GenerateRequest(BaseModel):
    prompt: str
    num_frames: int = 8   # Reduced to 8 for initial success (safety first)
    num_inference_steps: int = 50
    guidance_scale: float = 6.0
    seed: int = 42

class DeleteVideoRequest(BaseModel):
    filename: str

@app.get("/videos")
def list_videos():
    return load_videos()

@app.post("/delete_video")
def delete_video(req: DeleteVideoRequest):
    # Delete file
    file_path = os.path.join("..", "outputs", req.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Update DB
    delete_video_entry(req.filename)
    return {"status": "deleted", "filename": req.filename}

class RegenerateRequest(BaseModel):
    filename: str

@app.post("/regenerate")
def regenerate(req: RegenerateRequest):
    videos = load_videos()
    video = next((v for v in videos if v.get("filename") == req.filename), None)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    gen_req = GenerateRequest(
        prompt=video["prompt"],
        num_frames=video["frames"],
        num_inference_steps=video["params"]["steps"],
        guidance_scale=video["params"]["guidance"],
        seed=video["params"]["seed"]
    )
    return generate(gen_req)

class QueueActionRequest(BaseModel):
    filename: str

@app.post("/queue/cancel")
def cancel_job(req: QueueActionRequest):
    with db_lock:
        videos = load_videos()
        updated = False
        for v in videos:
            if v["filename"] == req.filename and v["status"] == "queued":
                v["status"] = "cancelled" # or delete
                updated = True
                break
        if updated:
            with open(VIDEO_DB_PATH, "w") as f:
                json.dump(videos, f, indent=2)
            return {"status": "cancelled", "filename": req.filename}
    raise HTTPException(status_code=404, detail="Job not found or not queued")

@app.post("/queue/promote")
def promote_job(req: QueueActionRequest):
    with db_lock:
        videos = load_videos()
        target = None
        for v in videos:
            if v["filename"] == req.filename and v["status"] == "queued":
                target = v
                break
        
        if target:
            # Set created_at to 1 year ago to bump to top
            target["created_at"] = (datetime.datetime.now() - datetime.timedelta(days=365)).isoformat()
            with open(VIDEO_DB_PATH, "w") as f:
                json.dump(videos, f, indent=2)
            return {"status": "promoted", "filename": req.filename}
            
    raise HTTPException(status_code=404, detail="Job not found or not queued")

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": pipe is not None, "device": DEVICE}

@app.get("/progress")
def progress():
    return PROGRESS_STATE



@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <html>
        <head>
            <title>CogVideoX – Video Generation API</title>
            <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
            <h1>CogVideoX – Video Generation API (T2V)</h1>
            <p>Status: Running</p>
            <p>Endpoints:</p>
            <ul>
                <li>POST /generate - Generate Video</li>
                <li>GET /health - Check Status</li>
            </ul>
        </body>
    </html>
    """

import threading
import time

# ... (Previous imports remain, ensuring simple diff) 

# --- Worker & Queue Logic ---
# --- Recovery & Concurrency Control ---
def reset_stuck_jobs():
    """Reset jobs stuck in 'generating' state on startup"""
    with db_lock:
        videos = load_videos()
        updated = False
        for v in videos:
            if v.get("status") == "generating":
                print(f"⚠️ Found stuck job {v['filename']}, marking as failed (interrupted).")
                v["status"] = "failed"
                v["error"] = "System restarted during generation"
                updated = True
        
        if updated:
            with open(VIDEO_DB_PATH, "w") as f:
                json.dump(videos, f, indent=2)

# Run recovery on startup
reset_stuck_jobs()

def get_next_queued_job():
    with db_lock:
        videos = load_videos()
        
        # STRICT CONCURRENCY: Check if ANY job is currently running
        current_running = [v for v in videos if v.get("status") == "generating"]
        if current_running:
            # If a job is running, DO NOT pick a new one
            return None

        # sort by created_at ascending (FIFO)
        queued = [v for v in videos if v["status"] == "queued"]
        if not queued:
            return None
        # Return oldest
        return sorted(queued, key=lambda x: x["created_at"])[0]

def worker_loop():
    print("🚀 Background Queue Worker Started")
    # Initial recovery
    reset_stuck_jobs()
    
    while True:
        try:
            job = get_next_queued_job()
            if job:
                process_job(job)
            else:
                time.sleep(5) # Poll interval increased to 5s to reduce disk I/O
        except Exception as e:
            print(f"💥 Worker Loop Error: {e}")
            time.sleep(5)

def process_job(job):
    print(f"🔄 Processing Job: {job['filename']}")
    
    # 1. Update Status to Generating
    update_video_status(job['filename'], "generating")
    
    global PROGRESS_STATE
    PROGRESS_STATE = {
        "status": "generating",
        "current_step": 0,
        "total_steps": job["params"]["steps"],
        "percentage": 0
    }

    try:
        # 2. Prepare Generation
        prompt = job["prompt"]
        num_frames = job["frames"]
        steps = job["params"]["steps"]
        guidance = job["params"]["guidance"]
        seed = job["params"]["seed"]
        filename = job["filename"]

        # Define callback
        def progress_callback(pipe, step, timestep, callback_kwargs):
            global PROGRESS_STATE
            PROGRESS_STATE["current_step"] = step
            PROGRESS_STATE["percentage"] = int((step / steps) * 100)
            time.sleep(1.0)  # Reduced thermal throttling (was 3.0)
            return callback_kwargs

        # Use CPU generator
        generator = torch.Generator(device="cpu").manual_seed(seed)
        
        # Run Pipeline
        if not pipe:
            raise Exception("Model not loaded")

        with torch.autocast(device_type=DEVICE, dtype=torch.float16):
            frames = pipe(
                prompt=prompt,
                num_frames=num_frames,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator,
                callback_on_step_end=progress_callback,
            ).frames[0]
        
        # Save Video
        output_path = os.path.join("..", "outputs", filename)
        os.makedirs(os.path.join("..", "outputs"), exist_ok=True)
        export_to_video(frames, output_path, fps=8)
        
        # 3. Update Success
        print(f"✅ Job Completed: {filename}")
        print("❄️ Cooling down for 10 seconds...")
        time.sleep(10) # Post-job Cool Down
        update_video_status(filename, "completed")
        PROGRESS_STATE["status"] = "idle"
        PROGRESS_STATE["percentage"] = 100
        
    except Exception as e:
        print(f"❌ Job Failed: {filename} - {e}")
        update_video_status(filename, "failed", str(e))
        PROGRESS_STATE["status"] = "failed"

# Start Worker Thread
worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()

@app.post("/generate")
def generate(req: GenerateRequest):
    # Just enqueue the job
    filename = f"cog_{uuid.uuid4()}.mp4"
    video_entry = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "prompt": req.prompt,
        "frames": req.num_frames,
        "status": "queued", # Initial status
        "engine": "cogvideox",
        "created_at": datetime.datetime.now().isoformat(),
        "params": {
            "steps": req.num_inference_steps,
            "guidance": req.guidance_scale,
            "seed": req.seed
        }
    }
    save_video_entry(video_entry)
    return {"status": "queued", "filename": filename, "position": "pending"}

# Serve static outputs folder
from fastapi.staticfiles import StaticFiles
os.makedirs(os.path.join("..", "outputs"), exist_ok=True)
app.mount("/outputs", StaticFiles(directory="../outputs"), name="outputs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7861)
