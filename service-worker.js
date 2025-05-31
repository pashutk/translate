// Cache names
const CACHE_VERSION = 12;
const STATIC_CACHE = 'translator-static-v' + CACHE_VERSION;
const DYNAMIC_CACHE = 'translator-dynamic-v' + CACHE_VERSION;

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  '/icons/icon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName.startsWith('translator-') && 
                  cacheName !== STATIC_CACHE && 
                  cacheName !== DYNAMIC_CACHE;
          }).map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event - respond with cached resources or fetch from network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Handle API requests differently (open-webui API)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
  } else {
    // For static assets use cache-first strategy
    event.respondWith(cacheFirstWithNetworkFallback(event.request));
  }
});

// Cache-first strategy with network fallback
async function cacheFirstWithNetworkFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache valid responses for future use
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (err) {
    // If it's an HTML request, return the offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    
    // Otherwise just fail
    console.error('Fetch failed:', err);
    throw err;
  }
}

// Network-first strategy with offline fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (err) {
    // If network fails, return offline message for API requests
    return new Response(
      JSON.stringify({
        response: "You're currently offline. Please check your network connection and try again."
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});