import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Get the GitHub repo name for GitHub Pages deployment
const getBase = () => {
  // If there's a base path set in env vars, use that
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH;
  }

  // For GitHub Pages deployment through GitHub Actions
  if (process.env.GITHUB_REPOSITORY) {
    return `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`;
  }

  // For local development
  return '/';
};

// Get random port to avoid conflicts
const getRandomPort = () => {
  // Use specific port if provided, otherwise use random port in a high range
  if (process.env.VITE_PORT) {
    return parseInt(process.env.VITE_PORT, 10);
  }
  
  // Use a random port between 4500-5500 by default
  // Avoiding all common ports that might cause conflicts
  const basePort = 4500;
  const range = 1000;
  const randomPort = basePort + Math.floor(Math.random() * range);
  
  // Explicitly avoid common ports that might be in use
  const reservedPorts = [5173, 5174, 5175, 3000, 8080, 8000, 8081, 8888];
  if (reservedPorts.includes(randomPort)) {
    return randomPort + 7; // Add larger offset to avoid adjacent ports
  }
  
  return randomPort;
};

// Generate different ports for main server and HMR
// Ensure they're significantly different to avoid any overlap
const mainPort = getRandomPort();
const hmrPort = mainPort + 237; // Use a prime number offset to reduce chance of conflicts

export default defineConfig({
  plugins: [react()],
  base: getBase(),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Create a vendor bundle to improve caching
          vendor: ['react', 'react-dom', 'react-beautiful-dnd'],
        }
      }
    },
    // Force Vite to copy assets with the original paths
    assetsInlineLimit: 0,
    target: 'es2015',
    // Safari/iOS should handle these well
    cssCodeSplit: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    // Force close existing connections to prevent "Listen has been called more than once" error
    force: true,
    
    // Use dynamic port allocation to avoid conflicts
    port: mainPort,
    strictPort: true, // Exit if port is in use rather than trying another one that might conflict
    
    // Separate HMR WebSocket port configuration
    hmr: {
      port: hmrPort, // Dedicated port for HMR WebSocket
      protocol: 'ws', // Use WebSocket instead of wss for better compatibility
      host: 'localhost', // Explicitly set host to avoid connection issues
      clientPort: hmrPort, // Ensure client connects to the right port
      timeout: 10000, // Extended timeout for spotty connections
      overlay: false, // Disable error overlay to reduce interaction with iOS audio
      // Allow reconnection but with limits
      reconnect: 10000, // Reconnect timeout in ms
    },
    
    // Optimize headers for better Safari/iOS performance
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Access-Control-Allow-Origin': '*',
    },
    
    // Optimize for iOS/Safari
    watch: {
      usePolling: false, // Don't use polling on iOS to save battery
    },
    
    // Handle Safari/iOS touch events properly
    middlewareMode: false,
    
    // Exit process on server shutdown
    closeOnExit: true,
  },
  optimizeDeps: {
    // Force Vite to scan all files when processing dependencies
    force: false,
    // Don't exclude node_modules from optimization
    exclude: [],
    // Include polyfills for better browser support
    include: ['react', 'react-dom', 'react-beautiful-dnd']
  },
  // Don't try to automatically open browser
  open: false,
  // Define custom environment variables that can be accessed in the app
  define: {
    'import.meta.env.VITE_APP_PORT': JSON.stringify(mainPort),
    'import.meta.env.VITE_HMR_PORT': JSON.stringify(hmrPort),
  }
}); 