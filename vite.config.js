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
  }
}); 