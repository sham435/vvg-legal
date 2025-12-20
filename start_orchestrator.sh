#!/bin/bash
cd backend
npm run start:dev > orchestrator.log 2>&1 &
echo "Orchestrator started with PID $!"
