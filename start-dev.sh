#!/bin/bash

# Fancy output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "\n${BOLD}${BLUE}🧙 Fantasy Soundboard Dev Server Launcher 🧙${NC}\n"

# Kill any existing processes using npm/vite ports
echo -e "${YELLOW}Stopping any running dev servers...${NC}"
for port in 5173 5174 3000 3001 3002 3003 3004 3005
do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Kill any hanging Vite/Node processes
echo -e "${YELLOW}Terminating any Vite processes...${NC}"
pkill -f "vite" || true
pkill -f "dev-server" || true

# Wait for ports to fully release
echo -e "${YELLOW}Waiting for ports to be released...${NC}"
sleep 3

# Generate a random port in a higher range to avoid conflicts
PORT=$(( 4000 + RANDOM % 1000 ))
echo -e "${GREEN}Starting dev server on port ${PORT}...${NC}"

# Clear node_modules/.vite to remove any cached HMR data
echo -e "${YELLOW}Clearing Vite cache...${NC}"
rm -rf node_modules/.vite 2>/dev/null || true

# Try running with a specific port and additional flags
echo -e "${GREEN}Launching development server...${NC}"
NODE_ENV=development VITE_PORT=$PORT npx --no-install vite --port $PORT --host localhost 