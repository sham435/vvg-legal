FROM python:3.11-slim
WORKDIR /app
# Install PyTorch CPU wheels
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
# Install CogVideoX package
RUN pip install cogvideox
COPY . .
EXPOSE 8002
CMD ["python","server.py"]
