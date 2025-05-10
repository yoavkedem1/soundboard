/**
 * Service Worker for Fantasy Soundboard
 * Provides offline functionality and PWA features
 * Version: 2.0 - Improved caching and error handling
 */

const CACHE_NAME = 'fantasy-soundboard-cache-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-placeholder.svg'
];

// Send message to all clients
const messageClients = async (message) => {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
};

// Log with prefixed messages for easier debugging
const logMessage = (message, isError = false) => {
  const method = isError ? console.error : console.log;
  method(`[ServiceWorker v2.0] ${message}`);
};

// Install event - cache assets
self.addEventListener('install', (event) => {
  logMessage('Installing service worker');
  self.skipWaiting(); // Force activation on all clients
  
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      logMessage('Core assets cached successfully');
    } catch (error) {
      logMessage(`Caching failed: ${error.message}`, true);
    }
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  logMessage('Activating service worker');
  
  // Immediately claim clients
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            logMessage(`Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    } catch (error) {
      logMessage(`Cache cleanup failed: ${error.message}`, true);
    }
  })());
});

// Check if request should be handled by service worker
const shouldHandleRequest = (request) => {
  // Don't handle non-GET requests
  if (request.method !== 'GET') return false;
  
  // Skip requests from different origins
  if (!request.url.startsWith(self.location.origin)) return false;
  
  // Skip service worker, HMR, and API requests
  if (request.url.includes('service-worker.js') || 
      request.url.includes('api/') ||
      request.url.includes('indexeddb') ||
      request.url.includes('hot-update') ||
      request.url.includes('ws') || 
      request.url.includes('__vite_')) {
    return false;
  }
  
  return true;
};

// Fetch event - network first for most resources, cache fallback
self.addEventListener('fetch', (event) => {
  // Quick exit for requests we shouldn't handle
  if (!shouldHandleRequest(event.request)) return;

  // Special handling for HTML navigation requests - Network first, then cache
  if (event.request.mode === 'navigate' || 
      (event.request.headers.get('Accept') && 
       event.request.headers.get('Accept').includes('text/html'))) {
    
    event.respondWith((async () => {
      try {
        // Try network first for fresh content
        logMessage(`Fetching (network first): ${event.request.url}`);
        const networkResponse = await fetch(event.request);
        
        // Cache the response for future use
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        logMessage(`Fetch failed, falling back to cache: ${event.request.url}`);
        
        // If network fails, try the cache
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If that fails too, try the index.html as fallback
        return caches.match('./index.html');
      }
    })());
    return;
  }

  // For static assets like JS, CSS, images - Cache first, then network
  event.respondWith((async () => {
    try {
      // Check cache first
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        logMessage(`Using cached version of: ${event.request.url}`);
        return cachedResponse;
      }
      
      // Not in cache, get from network
      logMessage(`Fetching from network: ${event.request.url}`);
      const response = await fetch(event.request);
      
      // Only cache valid responses
      if (!response || response.status !== 200) {
        return response;
      }
      
      // Cache the result for next time
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      logMessage(`Fetch error for ${event.request.url}: ${error.message}`, true);
      throw error;
    }
  })());
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    logMessage('Received skip waiting command');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UNREGISTER') {
    logMessage('Received unregister command');
    self.registration.unregister()
      .then(() => {
        return messageClients({ type: 'UNREGISTERED' });
      });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    logMessage('Received clear cache command');
    event.waitUntil((async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
        logMessage('All caches cleared successfully');
        messageClients({ type: 'CACHE_CLEARED' });
      } catch (error) {
        logMessage(`Error clearing caches: ${error.message}`, true);
      }
    })());
  }
}); 