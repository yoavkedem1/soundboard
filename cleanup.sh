#!/bin/bash

# Kill any processes using common development ports
echo "🧹 Cleaning up development ports..."

# Kill processes using common Vite ports
for port in 5173 5174 4500
do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Kill any hanging Vite processes
pkill -f "vite" 2>/dev/null || true

# Clear Vite cache
rm -rf node_modules/.vite 2>/dev/null || true

echo "✅ Cleanup complete! You can now run npm run dev" 