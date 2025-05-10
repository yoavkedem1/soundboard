// Script to safely launch Vite development server
// This fixes the "Listen method called more than once" error

import { spawn } from 'child_process';
import { exec } from 'child_process';

console.log('🔍 Checking for existing Vite processes...');

// Kill any vite processes
exec('pkill -f vite || true', (error) => {
  if (error) {
    console.log('⚠️ No Vite processes found to kill (this is fine)');
  } else {
    console.log('✅ Existing Vite processes terminated');
  }

  console.log('⏳ Waiting for ports to be released...');
  
  // Wait a moment for ports to be released
  setTimeout(() => {
    // Generate a random port between 4000-5000 to avoid conflicts
    const port = 4000 + Math.floor(Math.random() * 1000);
    console.log(`🚀 Starting Vite development server on port ${port}...`);
    
    // Launch Vite with specific parameters
    const viteProcess = spawn('npx', ['vite', '--port', port.toString(), '--host', 'localhost'], {
      stdio: 'inherit', // Show output in console
      env: { ...process.env }
    });
    
    viteProcess.on('error', (error) => {
      console.error('❌ Failed to start Vite:', error.message);
    });
  }, 2000);
}); 