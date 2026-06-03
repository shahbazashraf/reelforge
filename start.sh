#!/bin/bash
# ReelForge Start Script
echo "Starting ReelForge Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

echo "Starting ReelForge Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "Both services are running! Press Ctrl+C to stop."
trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM
wait
