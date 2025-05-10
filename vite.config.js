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
  return 4500 + Math.floor(Math.random() * 1000);
};

export default defineConfig({
  plugins: [react()],
  base: getBase(),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    // Force Vite to copy assets with the original paths
    assetsInlineLimit: 0
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    // Use random port to avoid conflicts
    port: getRandomPort(),
    strictPort: false, // Try another port if the port is in use
    host: 'localhost', // Bind only to localhost
    hmr: {
      // Use a separate port for HMR to avoid conflicts
      port: getRandomPort() + 1000,
      // Don't try to reconnect forever, give up after 3 attempts
      reconnect: 3,
      // Disable overlay that can cause issues
      overlay: false,
    },
    // Add this to properly close the previous server before starting a new one
    force: true,
    watch: {
      // Use polling for file changes with a longer interval to reduce CPU usage
      usePolling: false,
      interval: 1000,
      // Ignore these files to avoid unnecessary rebuilds
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    }
  },
  optimizeDeps: {
    // Force Vite to scan all files when processing dependencies
    force: false,
    // Don't exclude node_modules from optimization
    exclude: []
  },
  // Don't try to automatically open browser
  open: false,
  // Define custom environment variables that can be accessed in the app
  define: {
    'import.meta.env.VITE_APP_PORT': JSON.stringify(getRandomPort())
  }
}); 