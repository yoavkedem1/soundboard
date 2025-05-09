import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CssBaseline from '@mui/material/CssBaseline';

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);

// Check for service worker issues and unregister if there are problems
const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    window.location.reload(true); // Force reload without cache
  }
};

// Register service worker with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if the page loaded correctly
    if (document.getElementById('root')?.children.length === 0) {
      console.error('Page appears to be blank, attempting recovery...');
      unregisterServiceWorker();
      return;
    }
    
    // Use relative path to service worker
    const swUrl = new URL('./service-worker.js', window.location.href).href;
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registered with scope:', registration.scope);
        
        // Update service worker if needed
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker === null) return;
          
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
              } else {
                console.log('Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
        // If service worker fails, try to recover
        unregisterServiceWorker();
      });
      
    // Handle service worker communication errors
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'ERROR') {
        console.error('Service worker error:', event.data.message);
      }
    });
  });
} 