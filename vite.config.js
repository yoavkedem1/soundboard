import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// For GitHub Pages, always use /soundboard/ as the base path in production
const getBase = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/soundboard/';
  }
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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fantasy-soundboard.svg', 'favicon.ico'],
      manifest: {
        name: 'Fantasy Soundboard',
        short_name: 'Soundboard',
        description: 'A fantasy-themed soundboard for tabletop role-playing games',
        theme_color: '#8b5a2b',
        icons: [
          {
            src: 'pwa-icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  base: process.env.NODE_ENV === 'production' ? '/soundboard/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material']
        }
      }
    },
    // Force Vite to copy assets with the original paths
    assetsInlineLimit: 0,
    target: 'es2015',
    // Safari/iOS should handle these well
    cssCodeSplit: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
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
    strictPort: false,
    host: true,
    
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
      ignored: ['!**/node_modules/your-package-name/**']
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