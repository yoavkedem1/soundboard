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
    strictPort: true, // Error if port is in use instead of trying another
    host: 'localhost', // Bind only to localhost
    hmr: {
      // Disable auto websocket port selection
      clientPort: getRandomPort(),
      port: getRandomPort(),
      host: 'localhost',
      protocol: 'ws'
    }
  }
}); 