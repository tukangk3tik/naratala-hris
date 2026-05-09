#!/bin/bash

# Store the pids of child processes
pids=()

# Graceful shutdown handler
cleanup() {
  echo ""
  echo "🛑 Shutting down gracefully..."

  # Kill child processes gracefully
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  # Wait for processes to finish
  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done

  echo "✅ Shutdown complete"
  exit 0
}

# Register signal handlers
trap cleanup SIGINT SIGTERM

# Kill existing instances on ports 3000 (API) and 5173 (Web)
echo "🛑 Killing existing instances..."

# Kill processes on port 3000 (API)
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill processes on port 5173 (Web)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Kill any pnpm dev processes
pkill -f "pnpm.*dev" 2>/dev/null || true

sleep 1

# Start new instances
echo "🚀 Starting both API and Web servers..."
echo ""

pnpm --parallel --filter api --filter web dev &
pids+=($!)

# Wait for all child processes
wait
