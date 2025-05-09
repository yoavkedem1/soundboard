/**
 * Service Worker for Fantasy Soundboard
 * Provides offline functionality and PWA features
 * Version: 1.2 - GitHub Pages compatible
 */

const CACHE_NAME = 'fantasy-soundboard-cache-v3';

// Determine base path for GitHub Pages deployment
const getBasePath = () => {
  // Extract base path from service worker scope
  const scope = self.registration.scope;
  const pathMatch = scope.match(/^https?:\/\/[^\/]+(\/.+?)\/?$/);
  
  if (pathMatch && pathMatch[1] !== '/') {
    // Return the GitHub Pages base path (e.g., '/repo-name/')
    return pathMatch[1];
  }
  
  // Fallback to root
  return '';
};

// Assets to cache, relative to base path
const getAssetsToCache = (basePath) => [
  `${basePath}/`,
  `${basePath}/index.html`,
  `${basePath}/manifest.json`,
  `${basePath}/icons/icon-placeholder.svg`
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
      const basePath = getBasePath();
      console.log(`[ServiceWorker] Base path: ${basePath}`);
      
      const cache = await caches.open(CACHE_NAME);
      const assetsToCache = getAssetsToCache(basePath);
      console.log('[ServiceWorker] Caching app shell:', assetsToCache);
      await cache.addAll(assetsToCache);
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
      
      // Notify clients that service worker has been updated
      messageClients({ type: 'SW_UPDATED' });
    } catch (error) {
      console.error('[ServiceWorker] Cache cleanup failed:', error);
    }
  })());
});

// Fetch event - network first for navigation, cache first for assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.registration.scope)) {
    return;
  }
  
  // Skip service worker and API requests
  if (event.request.url.includes('service-worker.js') || 
      event.request.url.includes('api/') ||
      event.request.url.includes('socket')) {
    return;
  }

  // Handle navigation requests (HTML documents) - Network first with cache fallback
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('Accept')?.includes('text/html')) {
    
    event.respondWith((async () => {
      try {
        // Try network first for fresh content
        console.log('[ServiceWorker] Fetch HTML (network first):', event.request.url);
        const networkResponse = await fetch(event.request);
        
        // Cache the response
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        
        return networkResponse;
      } catch (error) {
        console.log('[ServiceWorker] Fetch HTML failed, using cache:', event.request.url);
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If cache fails, try to serve the index.html as a fallback
        return caches.match(`${getBasePath()}/index.html`);
      }
    })());
    return;
  }

  // For all other assets (JS, CSS, images) - Cache first with network fallback
  event.respondWith((async () => {
    try {
      // Try cache first for performance
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache, fetch from network
      console.log('[ServiceWorker] Fetching asset:', event.request.url);
      const response = await fetch(event.request);
      
      // Don't cache non-successful responses
      if (!response || response.status !== 200) {
        return response;
      }
      
      // Cache for future use
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      console.error('[ServiceWorker] Fetch error:', error);
      return new Response('Network error', { 
        status: 408, 
        headers: { 'Content-Type': 'text/plain' } 
      });
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