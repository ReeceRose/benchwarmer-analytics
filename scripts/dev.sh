#!/bin/bash
set -e

# Kill all child processes on exit
trap 'kill 0' EXIT

cd "$(dirname "$0")/.."

echo "Starting Benchwarmer Analytics development servers..."
echo ""

# Start API with hot reload
echo "[API] Starting (see output for port)"
dotnet watch run --project server/Benchwarmer.Api &

# Start frontend
echo "[Client] Starting on http://localhost:5173"
cd client && npm run dev &

wait
