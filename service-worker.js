/**
 * Service Worker for Fantasy Soundboard
 * Provides offline functionality and PWA features
 * Version: 1.1 - Less aggressive caching
 */

const CACHE_NAME = 'fantasy-soundboard-cache-v2'; // Incremented version to clear old caches
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

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting(); // Force activation on all clients
  
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      console.log('[ServiceWorker] Caching app shell');
    } catch (error) {
      console.error('[ServiceWorker] Caching failed:', error);
    }
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
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
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    } catch (error) {
      console.error('[ServiceWorker] Cache cleanup failed:', error);
    }
  })());
});

// Fetch event - network first for most resources, cache fallback
self.addEventListener('fetch', (event) => {
  // Don't handle non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip service worker and API requests
  if (event.request.url.includes('service-worker.js') || 
      event.request.url.includes('api/') ||
      event.request.url.includes('indexeddb')) {
    return;
  }

  // Special handling for HTML navigation requests - Network first, then cache
  if (event.request.mode === 'navigate' || 
      (event.request.headers.get('Accept') && 
       event.request.headers.get('Accept').includes('text/html'))) {
    
    event.respondWith((async () => {
      try {
        // Try network first for fresh content
        console.log('[ServiceWorker] Fetch (network first):', event.request.url);
        const networkResponse = await fetch(event.request);
        
        // Cache the response for future use
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        
        return networkResponse;
      } catch (error) {
        console.log('[ServiceWorker] Fetch failed, falling back to cache:', event.request.url);
        
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

  // For all other assets (JS, CSS, images) - Cache first, then network
  event.respondWith((async () => {
    try {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        console.log('[ServiceWorker] Using cached version of:', event.request.url);
        return cachedResponse;
      }
      
      console.log('[ServiceWorker] Fetching resource:', event.request.url);
      const response = await fetch(event.request);
      
      if (!response || response.status !== 200) {
        return response;
      }
      
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      console.error('[ServiceWorker] Fetch error:', error);
      throw error;
    }
  })());
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UNREGISTER') {
    self.registration.unregister()
      .then(() => {
        return messageClients({ type: 'UNREGISTERED' });
      });
  }
}); 