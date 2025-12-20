# Local Video Generation Setup Guide

This guide explains how to set up and run the local video generation servers (CogVideoX and SVD) on macOS with Apple Silicon (MPS) support.

## Prerequisites

- **Python 3.10+** (Checked: 3.13.5)
- **PyTorch** with MPS support (Checked: 2.9.1, MPS Available)
- **RAM**: 16GB+ Unified Memory recommended.

## 1. CogVideoX Server (Port 7861)

This server uses the `THUDM/CogVideoX-2b` model.

### Setup

1. Navigate to the directory:
   ```bash
   cd backend/cogvideox
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. **Download Model Weights** (Recommended before starting):
   The model checks in at ~10GB. To avoid timeouts during server startup, run:
   ```bash
   python3 download_weights.py
   ```

### Running the Server

```bash
python3 server.py
```

- **Device**: Automatically detects MPS.
- **Endpoint**: `http://localhost:7861/generate`

## 2. SVD (Stable Video Diffusion) Server (Port 7860)

This server uses the `stabilityai/stable-video-diffusion-img2vid` model.

### Setup

1. Navigate to the directory:
   ```bash
   cd backend/svd
   ```
   _Note: SVD dependencies are usually managed within the main backend or its own environment. Ensure `diffusers` and `torch` are installed._

### Running the Server

```bash
python3 server.py
```

- **Device**: Automatically detects MPS (customized for Mac).
- **Endpoint**: `http://localhost:7860/generate`

## Troubleshooting

### "ReadTimeoutError" during download

- Use the `download_weights.py` script which handles resumes.
- If it fails, retry running the script.

### "Out of Memory" (OOM) / System Freeze

- Large video models consume significant Unified Memory.
- If your system becomes unresponsive, the server might be using too much RAM/VRAM.
- **Fix**: force `DEVICE="cpu"` in `server.py` to use system RAM (slower but safer) instead of MPS if you have <16GB RAM.
