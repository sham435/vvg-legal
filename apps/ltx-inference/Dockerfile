FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for FastAPI service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone LTX-Video repository
# Note: In production, you may want to use a specific commit/tag
RUN git clone https://github.com/Lightricks/LTX-Video.git || echo "Repository clone will be handled externally"

# Install LTX-Video dependencies
# This assumes the repo structure matches the official repo
WORKDIR /app/LTX-Video
RUN pip install -e .[inference-script] || echo "LTX-Video installation will be handled externally"

WORKDIR /app

# Copy service code
COPY app.py .

# Create directories
RUN mkdir -p /app/uploads /app/outputs

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Run service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
