#!/bin/bash

# Function to kill all background processes on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down VVG Stack..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "============================================="
echo "   🚀 Viral Video Generator - Access Stack   "
echo "============================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# 1. Start Python AI Server
echo "🐍 [1/3] Starting CogVideoX AI Server..."
cd backend/cogvideox
# Check if virtualenv exists, if so activate it (optional logic, assuming global for now based on history)
python3 server.py > ../../logs/cogvideox.log 2>&1 &
COG_PID=$!
echo "   -> Python Server PID: $COG_PID (Logs: logs/cogvideox.log)"
cd ../..

# 2. Start NestJS Backend
echo "🦅 [2/3] Starting NestJS Orchestrator..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
NEST_PID=$!
echo "   -> NestJS PID: $NEST_PID (Logs: logs/backend.log)"
cd ..

# 3. Start Frontend
echo "⚛️  [3/3] Starting React Frontend..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   -> Frontend PID: $FRONTEND_PID (Logs: logs/frontend.log)"
cd ..

echo "============================================="
echo "✅ Stack Initialized! System coming online..."
echo "---------------------------------------------"
echo "📝 Logs available in ./logs/"
echo "---------------------------------------------"
echo "🖥️  Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:3000"
echo "🧠 AI Model: http://localhost:7861"
echo "============================================="
echo "Press Ctrl+C to stop all services."

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait endlessly to keep script running
wait
