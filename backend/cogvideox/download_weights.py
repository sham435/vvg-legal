from huggingface_hub import snapshot_download
import sys

# ID of the model repository
repo_id = "THUDM/CogVideoX-2b"

print(f"Starting robust download for {repo_id}...")
print("This may take a while depending on your internet connection.")

try:
    # Download to default HF cache (~/.cache/huggingface/hub)
    # resume_download=True is default in newer versions but good to be explicit if using older ones, 
    # though snapshot_download handles resumes efficiently.
    local_path = snapshot_download(
        repo_id=repo_id,
        repo_type="model",
        resume_download=True,
    )
    print(f"Successfully downloaded {repo_id} to {local_path}")
except Exception as e:
    print(f"Failed to download model: {e}", file=sys.stderr)
    sys.exit(1)
