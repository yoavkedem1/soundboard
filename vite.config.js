import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get the GitHub repo name for GitHub Pages deployment
const getBase = () => {
  // If there's a base path set in env vars, use that
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH;
  }
  
  // For GitHub Pages: use repo name as base (or './' as fallback)
  return process.env.GITHUB_REPOSITORY 
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
    : './';
};

export default defineConfig({
  plugins: [react()],
  base: getBase(),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}); 