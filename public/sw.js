// Service Worker for Survey Application
// Provides offline functionality and advanced caching

const CACHE_NAME = 'survey-app-v1.2.1'; // Cache version bump
const STATIC_CACHE_NAME = 'survey-static-v1.2.1';
const DYNAMIC_CACHE_NAME = 'survey-dynamic-v1.2.1';

// Resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/analytics',
    '/analytics.html',
    '/styles.css',
    '/analytics.css',
    '/script.js',
    '/analytics.js',
    '/modules/SecurityValidator.js',
    '/modules/DataService.js',
    '/modules/ChartManager.js',
    '/modules/UIController.js',
    '/modules/ExportService.js',
    '/favicon.ico'
];

// CDN resources with fallbacks
const CDN_RESOURCES = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/analytics/responses',
    '/analytics/emails',
    '/api/survey-config',
    '/api/email-config'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Cache CDN resources
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching CDN resources');
                const cdnRequests = CDN_RESOURCES.map(url => new Request(url, { mode: 'cors' }));
                return Promise.allSettled(
                    cdnRequests.map(request => 
                        cache.add(request).catch(err => 
                            console.warn(`Failed to cache ${request.url}:`, err)
                        )
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (url.pathname.startsWith('/analytics/')) {
        // Analytics API - Network First with Cache Fallback
        event.respondWith(handleApiRequest(request));
    } else if (url.pathname.startsWith('/api/')) {
        // API requests - Network First with Cache Fallback
        event.respondWith(handleApiRequest(request));
    } else if (isStaticAsset(url.pathname)) {
        // Static assets - Cache First
        event.respondWith(handleStaticAsset(request));
    } else if (isCDNResource(url.href)) {
        // CDN resources - Cache First with Network Fallback
        event.respondWith(handleCDNResource(request));
    } else {
        // HTML pages - Network First with Cache Fallback
        event.respondWith(handlePageRequest(request));
    }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache:', request.url);
        
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(
            JSON.stringify({ error: 'Offline - Service unavailable' }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    if (!request.url.startsWith('http')) {
        return new Response('Unsupported protocol', { status: 400 });
    }

    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Failed to fetch static asset:', request.url);
        return new Response('Offline - Asset unavailable', { status: 503 });
    }
}

// Handle CDN resources
async function handleCDNResource(request) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: CDN resource unavailable:', request.url);
        return new Response('/* CDN resource unavailable */', { 
            status: 503,
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: Page request failed, trying cache:', request.url);
        
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Offline - Survey App</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .offline-message { color: #666; }
                </style>
            </head>
            <body>
                <h1>You're Offline</h1>
                <p class="offline-message">Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
            </body>
            </html>
        `, {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Helper functions
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isCDNResource(url) {
    return CDN_RESOURCES.some(cdnUrl => url.includes(cdnUrl.split('/')[2]));
}

// Message handling for cache management
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CLEAR_ANALYTICS_CACHE':
            clearAnalyticsCache().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
    }
});

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('Service Worker: All caches cleared');
}

// Clear analytics cache
async function clearAnalyticsCache() {
    await caches.delete(ANALYTICS_CACHE_NAME);
    console.log('Service Worker: Analytics cache cleared');
}

// Get cache status
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        status[name] = keys.length;
    }
    
    return status;
}