#!/bin/bash

# Fix server and database issues
# This script will:
# 1. Kill any existing servers
# 2. Clean up old database files
# 3. Start the server with proper configuration
# 4. Run tests to verify everything works

# Terminal colors
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color
BOLD="\033[1m"

echo -e "\n${BOLD}${BLUE}🧙 Fantasy Soundboard Server Fixer 🧙${NC}\n"

# Step 1: Kill any running processes
echo -e "${YELLOW}Stopping any running servers...${NC}"
for port in {3000..9000}
do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Kill any Vite processes
echo -e "${YELLOW}Killing any Vite processes...${NC}"
pkill -f "vite" || true
pkill -f "node" || true

# Wait for ports to be released
echo -e "${YELLOW}Waiting for ports to be released...${NC}"
sleep 2

# Step 2: Clean database files
echo -e "${YELLOW}Cleaning IndexedDB files...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  rm -rf ~/Library/Application\ Support/IndexedDB/file__* 2>/dev/null || true
  rm -rf ~/Library/Safari/Databases/IndexedDB/*/soundboard_* 2>/dev/null || true
  rm -rf ~/Library/WebKit/WebsiteData/IndexedDB/*/soundboard_* 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  rm -rf ~/.config/google-chrome/Default/IndexedDB/file__* 2>/dev/null || true
  rm -rf ~/.mozilla/firefox/*/storage/default/*/idb/*/soundboard* 2>/dev/null || true
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
  # Windows
  echo -e "${YELLOW}On Windows, please delete browser IndexedDB files manually${NC}"
fi

# Step 3: Clean npm cache
echo -e "${YELLOW}Cleaning npm cache...${NC}"
npm cache clean --force 2>/dev/null || true

# Clear Vite cache
echo -e "${YELLOW}Cleaning Vite cache...${NC}"
rm -rf node_modules/.vite 2>/dev/null || true

# Step 4: Run the test script
echo -e "\n${GREEN}${BOLD}Running the test script...${NC}\n"
node scripts/test-app.js

# If test was successful, show a success message
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}✅ Server and database issues fixed successfully!${NC}\n"
  echo -e "You can now run the app with ${BLUE}npm run dev${NC}"
else
  echo -e "\n${RED}${BOLD}❌ There were problems with the fix.${NC}\n"
  echo -e "Please check the errors above and try running ${BLUE}npm run dev${NC} manually."
fi 