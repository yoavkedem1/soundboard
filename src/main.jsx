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
    console.log('Service workers unregistered');
  }
};

// Register service worker with better error handling for GitHub Pages
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only attempt to register if we've successfully rendered the app
    if (document.getElementById('root')?.children.length === 0) {
      console.error('App failed to render, not registering service worker');
      return;
    }
    
    // Get the base URL for proper service worker scope
    const getBaseUrl = () => {
      const baseElement = document.querySelector('base');
      if (baseElement && baseElement.href) {
        return new URL('.', baseElement.href).pathname;
      }
      
      // Detect if we're in GitHub Pages
      const isGitHubPages = window.location.hostname.includes('.github.io');
      if (isGitHubPages) {
        // Extract the repo name from the pathname
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 1 && pathParts[1].length > 0) {
          return `/${pathParts[1]}/`;
        }
      }
      
      return '/';
    };
    
    // Use the correct path for the service worker
    const swUrl = new URL('service-worker.js', window.location.href).href;
    
    // Register the service worker
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registered with scope:', registration.scope);
        
        // Handle updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker === null) return;
          
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New service worker installed, content updated');
              } else {
                console.log('Service worker installed, content cached for offline use');
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('Service worker was updated');
      }
    });
    
    // Handle errors that might occur after registration
    window.addEventListener('error', (event) => {
      // If we see frequent errors after service worker registration,
      // it might be causing issues
      if (navigator.serviceWorker.controller && 
          event.message && 
          (event.message.includes('fetch') || event.message.includes('DOM'))) {
        console.warn('Errors detected, considering service worker reset');
      }
    });
  });
} 