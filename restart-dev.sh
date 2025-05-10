#!/bin/bash

echo "🧹 Cleaning up development server processes..."

# Force kill any Vite/Node processes that might be causing issues
pkill -9 -f vite || true
pkill -9 -f node || true

# Kill processes on common ports
for port in {4000..6000}; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Clean Vite cache
echo "🧼 Cleaning Vite cache..."
rm -rf node_modules/.vite 2>/dev/null || true

# Wait for ports to fully release
echo "⏳ Waiting for ports to be released..."
sleep 2

# Start dev server
echo "🚀 Starting development server..."
npm run dev 