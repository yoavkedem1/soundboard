# Fantasy Soundboard Troubleshooting Guide

This document provides solutions for common issues that may occur with the Fantasy Soundboard application.

## Common Issues and Solutions

### WebSocket Connection Errors

**Symptoms:**
- Console errors like `WebSocket connection to 'ws://localhost:5174/?token=xxx' failed`
- Hot Module Replacement (HMR) not working
- Changes not automatically reflecting in the browser

**Solutions:**

1. **Update Vite HMR Configuration**

   In `vite.config.js`, ensure proper WebSocket configuration:

   ```js
   server: {
     hmr: {
       protocol: 'ws',
       host: 'localhost',
       port: 5173, // Explicitly set the WebSocket port
       overlay: false
     }
   }
   ```

2. **Restart Development Server**

   ```bash
   # Kill any running processes on the relevant ports
   npx kill-port 5173 5174
   
   # Restart the development server
   npm run dev
   ```

3. **Check for Port Conflicts**

   If another application is using port 5173 or 5174, change the port in `vite.config.js`:

   ```js
   server: {
     port: 3000, // Use a different port
     hmr: {
       port: 3000
     }
   }
   ```

### MUI Tooltip Warnings

**Symptoms:**
- Console warnings like `MUI: You have provided a title prop to the child of <Tooltip />. Remove this title prop or the Tooltip component.`

**Solutions:**

1. **Remove title attributes from components inside Tooltips**

   Instead of:
   ```jsx
   <Tooltip title="Reset">
     <IconButton title="Reset">
       <RefreshIcon />
     </IconButton>
   </Tooltip>
   ```

   Use:
   ```jsx
   <Tooltip title="Reset">
     <IconButton aria-label="Reset">
       <RefreshIcon />
     </IconButton>
   </Tooltip>
   ```

2. **Use aria-label for accessibility**

   Always add `aria-label` to maintain accessibility:
   ```jsx
   <Tooltip title="Add Sound">
     <Fab color="primary" aria-label="Add Sound">
       <AddIcon />
     </Fab>
   </Tooltip>
   ```

### Audio Playback Issues

**Symptoms:**
- Sounds not playing
- Multiple sounds not playing simultaneously
- Volume control not working

**Solutions:**

1. **Check Browser Audio Permissions**
   
   Ensure your browser has permission to play audio.

2. **Initialize Audio Context with User Interaction**

   Audio context should be initialized after a user interaction:
   ```jsx
   const initAudioContext = () => {
     if (!audioContext) {
       const context = new (window.AudioContext || window.webkitAudioContext)();
       setAudioContext(context);
     }
   };
   ```

3. **Master Volume Control**

   Ensure the master volume multiplier is being correctly applied to all audio elements:
   ```js
   // Apply master volume to each individual sound's volume
   audio.volume = Math.max(0, Math.min(1, baseVolume * masterVolume));
   ```

## Running Diagnostic Tests

We've included diagnostic tools to help troubleshoot issues:

```bash
# Run the automated testing and diagnostic script
./test-and-fix.sh
```

Or manually:

```bash
# Make sure test directories exist
mkdir -p test test-results

# Install dependencies if needed
npm install --save-dev @playwright/test @types/node kill-port

# Run diagnostic tests
node test/run-diagnostics.js
```

## Clearing Cache

If problems persist, try clearing caches:

```bash
# Clear service worker cache
npm run clear-sw

# Clear browser cache
# In Chrome: Settings > Privacy and security > Clear browsing data
```

## Still Having Issues?

If you continue experiencing problems after trying these solutions, please:

1. Check the console for specific error messages
2. Take a screenshot of any error messages
3. Report the issue with details about your environment (browser, OS, etc.)

You can submit issues at [GitHub Issues](https://github.com/yourusername/fantasy-soundboard/issues) or contact support. 