FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Set Hugging Face cache to a writable directory for Railway
ENV HF_HOME=/app/.cache
ENV TRANSFORMERS_CACHE=/app/.cache

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create cache directory with correct permissions
RUN mkdir -p /app/.cache && chmod 777 /app/.cache

# Expose port 8080 (Railway default)
EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
