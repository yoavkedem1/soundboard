#!/bin/bash

# Fancy output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Track child processes
DEV_SERVER_PID=""

# Function to clean up processes when the script exits
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"
  # Kill dev server if it's still running
  if [ ! -z "$DEV_SERVER_PID" ]; then
    kill $DEV_SERVER_PID 2>/dev/null || true
  fi
  
  # Try to kill any running Vite processes
  pkill -f "vite" 2>/dev/null || true
  npx kill-port 5173 5174 $PORT 2>/dev/null || true
  
  # Restore the original diagnostics script
  if [ -f test/run-diagnostics.js.bak ]; then
    mv test/run-diagnostics.js.bak test/run-diagnostics.js 2>/dev/null || true
  fi
  
  echo -e "\n${GREEN}Done!${NC}\n"
  exit 0
}

# Set up trap for clean exit
trap cleanup EXIT SIGINT SIGTERM

echo -e "\n${BOLD}${BLUE}🧙 Fantasy Soundboard Test & Fix Script 🧙${NC}\n"

# Create directories if they don't exist
echo -e "${YELLOW}Creating test directories...${NC}"
mkdir -p test test-results

# Install dependencies if needed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if ! npm list @playwright/test --depth=0 &>/dev/null; then
  echo -e "${YELLOW}Installing Playwright testing framework...${NC}"
  npm install --save-dev @playwright/test @types/node
  
  echo -e "\n${YELLOW}Installing Playwright browsers...${NC}"
  npx playwright install --with-deps chromium
else
  echo -e "${GREEN}✓ Playwright dependencies already installed${NC}"
fi

# Ensure no dev servers are running
echo -e "\n${YELLOW}Stopping any running dev servers...${NC}"
if command -v npx &> /dev/null; then
  npx kill-port 5173 5174 || true
  # Also make sure to kill any hanging Vite servers
  pkill -f "vite" || true
fi

# Wait a moment for ports to fully release
sleep 2

# Start the dev server in background with a random port to avoid conflicts
echo -e "\n${YELLOW}Starting development server in background...${NC}"
PORT=$(( 3000 + RANDOM % 3000 ))
echo -e "${YELLOW}Using port ${PORT}...${NC}"
VITE_PORT=$PORT npm run dev -- --port $PORT &
DEV_SERVER_PID=$!

# Give the server time to start
echo -e "${YELLOW}Waiting for server to start...${NC}"
sleep 5

# Update the diagnostics script to use the correct port
echo -e "\n${YELLOW}Configuring diagnostics to use port ${PORT}...${NC}"
sed -i.bak "s|http://localhost:PORT_PLACEHOLDER/|http://localhost:${PORT}/|g" test/run-diagnostics.js

# Run the diagnostic tests and capture output
echo -e "\n${BOLD}${BLUE}=== Running Diagnostic Tests ===${NC}\n"
node test/run-diagnostics.js 2>&1 | tee test-results/test-output.txt
TEST_EXIT_CODE=${PIPESTATUS[0]}

# No need to wait for user input now
echo -e "\n${GREEN}Tests completed automatically!${NC}"

# Check for flashing modules issues and fix if needed
if [ $TEST_EXIT_CODE -ne 0 ] || grep -q "UI element .* is flashing" test-results/test-output.txt 2>/dev/null; then
  echo -e "\n${YELLOW}UI flashing issues detected. Applying fixes...${NC}"
  
  # Apply comprehensive CSS fix for flashing elements
  mkdir -p css
  cat > css/fixes.css << EOF
/* Fix for flashing UI elements */
/* Disable all transitions for better performance */
*, *::before, *::after {
  transition: none !important;
  animation: none !important;
}

/* Specific fixes for MUI components */
.MuiPaper-root,
.MuiCard-root,
.MuiButton-root,
.sound-item,
[data-sound-item] {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

/* Fix for hover states */
.MuiPaper-root:hover,
.MuiCard-root:hover,
.MuiButton-root:hover,
.sound-item:hover,
[data-sound-item]:hover {
  transform: none !important;
  transition: none !important;
}

/* Fix for button transitions */
.MuiButtonBase-root {
  transition: none !important;
}
EOF
  
  # Add the CSS file to index.html
  if ! grep -q "fixes.css" index.html; then
    sed -i.bak '/<\/head>/i \    <link rel="stylesheet" href="css/fixes.css">' index.html
    echo -e "${GREEN}✓ Added CSS fixes for UI flashing issues${NC}"
  fi
  
  # Update App.jsx to remove transitions
  if [ -f src/App.jsx ]; then
    echo -e "${YELLOW}Updating App.jsx to fix transitions...${NC}"
    
    # Create a backup if it doesn't exist already
    if [ ! -f src/App.jsx.orig ]; then
      cp src/App.jsx src/App.jsx.orig
    fi
    
    # Replace transition properties
    sed -i.bak 's/transition: *[^,;}]*/transition: none/g' src/App.jsx
    sed -i.bak 's/animation: *[^,;}]*/animation: none/g' src/App.jsx
    
    # Fix theme transitions
    sed -i.bak 's/"all 0.[0-9]s ease"/"none"/g' src/App.jsx
    echo -e "${GREEN}✓ Updated App.jsx transitions${NC}"
  fi
  
  # Update theme in App.jsx to disable transitions globally
  if [ -f src/App.jsx ] && ! grep -q "transitions: { create: () => 'none' }" src/App.jsx; then
    sed -i.bak '/components: {/i \  transitions: { create: () => "none" },' src/App.jsx
    echo -e "${GREEN}✓ Disabled transitions in MUI theme${NC}"
  fi
fi

# Exit script - cleanup function will handle the rest
echo -e "\n${GREEN}Script completed successfully!${NC}" 