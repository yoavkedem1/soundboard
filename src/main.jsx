import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CssBaseline from '@mui/material/CssBaseline';

// Detect if this is the first load after a reset
const needsForcedCleanLoad = () => {
  // Check if we're already in a clean reload
  if (window.location.search.includes('forceclean=1')) {
    return false;
  }
  
  // Check if the service worker is active
  const hasServiceWorker = navigator.serviceWorker && navigator.serviceWorker.controller;
  
  // Check local storage flag
  const cleanLoadFlag = localStorage.getItem('clean_load_complete');
  const needsClean = !cleanLoadFlag;
  
  // Set the flag for next time
  if (needsClean) {
    localStorage.setItem('clean_load_complete', 'true');
  }
  
  // Force a clean load on first app load
  return needsClean && hasServiceWorker;
};

// Force a clean reload if needed
if (needsForcedCleanLoad()) {
  console.log("First app load detected, forcing clean reload...");
  window.location.href = window.location.pathname + '?forceclean=1';
} else {
  // Only render if we're not forcing a reload
  // Render the app
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <CssBaseline />
      <App />
    </React.StrictMode>
  );
}

// Check for service worker issues and unregister if there are problems
const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let unregistered = false;
      
      for (const registration of registrations) {
        await registration.unregister();
        unregistered = true;
      }
      
      if (unregistered) {
        console.log('Service workers unregistered successfully');
        // If we unregistered a service worker, clear cache and reload
        if (window.caches) {
          // Get all cache keys
          try {
            const cacheKeys = await window.caches.keys();
            // Delete all caches
            await Promise.all(
              cacheKeys.map(key => window.caches.delete(key))
            );
            console.log('Caches cleared successfully');
          } catch (err) {
            console.error('Error clearing caches:', err);
          }
        }
        
        // Return true if we did unregister service workers
        return true;
      }
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }
  return false;
};

// Function to force reload with cache clearing if database issues are detected
export const forceCleanReload = async () => {
  const swUnregistered = await unregisterServiceWorker();
  
  // Try to clear IndexedDB connections before reload
  if (window.indexedDB) {
    const dbs = await window.indexedDB.databases();
    console.log('Found IndexedDB databases:', dbs);
  }
  
  // If a service worker was unregistered, it's better to reload the page
  if (swUnregistered) {
    console.log('Reloading page after service worker cleanup...');
    window.location.reload(true); // Force reload from server, not cache
  }
};

// Check if we need a clean reload based on URL param
if (window.location.search.includes('forceclean=1')) {
  forceCleanReload();
} else {
  // Check for database issues
  window.addEventListener('error', async (event) => {
    if (event.message && (
      event.message.includes('IndexedDB') || 
      event.message.includes('VersionError') || 
      event.message.includes('Database')
    )) {
      console.warn('Database error detected, performing service worker cleanup');
      const reloaded = await forceCleanReload();
      if (!reloaded) {
        // If we didn't reload, add a param to force clean reload
        window.location.href = window.location.pathname + '?forceclean=1';
      }
    }
  });
}

// Register service worker with better error handling for GitHub Pages
if ('serviceWorker' in navigator) {
  // Extract service worker registration code into a function
  const registerServiceWorker = () => {
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
    
    // Use the current location for service worker registration
    // to ensure proper scope and protocol
    const swUrl = new URL('service-worker.js', window.location.origin + '/').href;
    
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
                // Make sure IndexedDB is not impacted by the service worker update
                setTimeout(() => {
                  // Force app to reload data
                  document.dispatchEvent(new CustomEvent('sw-updated'));
                }, 1000);
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
  };

  window.addEventListener('load', () => {
    // Only attempt to register if we've successfully rendered the app
    setTimeout(() => {
      const rootElement = document.getElementById('root');
      if (!rootElement || rootElement.children.length === 0) {
        console.error('App failed to render properly, waiting longer before checking');
        // Try again after another delay
        setTimeout(() => {
          if (document.getElementById('root')?.children.length > 0) {
            registerServiceWorker();
          } else {
            console.error('App still failed to render, not registering service worker');
          }
        }, 2000);
        return;
      }
      registerServiceWorker();
    }, 1000);
    
    // Check for WebSocket errors and reload if needed
    window.addEventListener('error', (event) => {
      if (event.message && 
          (event.message.includes('WebSocket') || 
           event.message.includes('ws://localhost:undefined'))) {
        console.warn('WebSocket connection error detected, refreshing page...');
        // Wait a moment before reloading to avoid infinite reload loops
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('Service worker was updated');
        // Force app to reload data
        document.dispatchEvent(new CustomEvent('sw-updated'));
      }
    });
    
    // Handle errors that might occur after registration
    window.addEventListener('error', async (event) => {
      // If we see frequent errors after service worker registration,
      // it might be causing issues
      if (navigator.serviceWorker.controller && 
          event.message && 
          (event.message.includes('fetch') || 
           event.message.includes('DOM') ||
           event.message.includes('IndexedDB'))) {
        console.warn('Errors detected, considering service worker reset');
        
        // Count errors to decide if we need to unregister service worker
        const errorCount = (window._swErrorCount || 0) + 1;
        window._swErrorCount = errorCount;
        
        if (errorCount >= 3) {
          console.warn('Multiple errors detected, unregistering service worker');
          await unregisterServiceWorker();
        }
      }
    });
  });
} 