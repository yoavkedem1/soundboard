import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CssBaseline from '@mui/material/CssBaseline';
import { initializeDatabase } from './db';

/**
 * Start the application
 */
async function startApp() {
  console.log('Starting Fantasy Soundboard...');
  
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Render the app
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <CssBaseline />
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Failed to start app:', err);
    
    // Show error message in UI
    document.getElementById('root').innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2>Sorry, Fantasy Soundboard couldn't start</h2>
        <p>There was a problem initializing the app data.</p>
        <button onclick="window.location.reload(true)">Reload and try again</button>
      </div>
    `;
  }
}

// Unregister any existing service workers in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('Development mode detected, cleaning up service workers');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('Service worker unregistered');
      }
    });
  }
}

// Start the app
startApp(); 