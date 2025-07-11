const path = require('path');
const NodeCache = require('node-cache');

// Create cache instances
const analyticsCache = new NodeCache({ 
    stdTTL: 300, // 5 minutes for analytics data
    checkperiod: 60, // Check for expired keys every minute
    useClones: false
});

const staticCache = new NodeCache({ 
    stdTTL: 86400, // 24 hours for static assets
    checkperiod: 3600, // Check every hour
    useClones: false
});

/**
 * Enhanced static file caching middleware with optimized headers
 */
function staticCacheHeaders(req, res, next) {
    const ext = path.extname(req.path).toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set cache headers based on file type
    switch (ext) {
        case '.css':
        case '.js':
            // CSS and JS files - cache for 1 year with versioning
            res.set({
                'Cache-Control': isProduction ? 'public, max-age=31536000, immutable' : 'no-cache',
                'ETag': true,
                'Last-Modified': true
            });
            break;
            
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.svg':
        case '.ico':
            // Images - cache for 30 days
            res.set({
                'Cache-Control': isProduction ? 'public, max-age=2592000' : 'public, max-age=3600',
                'ETag': true,
                'Last-Modified': true
            });
            break;
            
        case '.woff':
        case '.woff2':
        case '.ttf':
        case '.eot':
            // Fonts - cache for 1 year
            res.set({
                'Cache-Control': isProduction ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
                'ETag': true
            });
            break;
            
        case '.html':
            // HTML files - no cache or short cache
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            break;
            
        case '.json':
            // JSON files - short cache
            res.set({
                'Cache-Control': isProduction ? 'public, max-age=300' : 'no-cache',
                'ETag': true
            });
            break;
            
        default:
            // Default - moderate cache
            res.set({
                'Cache-Control': isProduction ? 'public, max-age=3600' : 'no-cache',
                'ETag': true,
                'Last-Modified': true
            });
    }
    
    next();
}

/**
 * Analytics data caching middleware
 */
function cacheAnalyticsData(cacheDuration = 300) {
    return (req, res, next) => {
        // Create cache key from request path and query parameters
        const cacheKey = `${req.path}_${JSON.stringify(req.query)}`;
        
        // Check if data exists in cache
        const cachedData = analyticsCache.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for: ${cacheKey}`);
            res.set({
                'X-Cache': 'HIT',
                'Cache-Control': `public, max-age=${cacheDuration}`,
                'ETag': `"${Date.now()}"`
            });
            return res.json(cachedData);
        }
        
        // Store original json method
        const originalJson = res.json;
        
        // Override json method to cache the response
        res.json = function(data) {
            // Cache the data
            analyticsCache.set(cacheKey, data, cacheDuration);
            console.log(`Cache set for: ${cacheKey}`);
            
            // Set cache headers
            res.set({
                'X-Cache': 'MISS',
                'Cache-Control': `public, max-age=${cacheDuration}`,
                'ETag': `"${Date.now()}"`
            });
            
            // Call original json method
            return originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Clear analytics cache when data is updated
 */
function clearAnalyticsCache(pattern = null) {
    if (pattern) {
        const keys = analyticsCache.keys();
        const keysToDelete = keys.filter(key => key.includes(pattern));
        analyticsCache.del(keysToDelete);
        console.log(`Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    } else {
        analyticsCache.flushAll();
        console.log('Cleared all analytics cache');
    }
}

/**
 * API response caching for frequently accessed endpoints
 */
function cacheApiResponse(duration = 300) {
    return (req, res, next) => {
        // Skip caching for POST, PUT, DELETE requests
        if (req.method !== 'GET') {
            return next();
        }
        
        const cacheKey = `api_${req.originalUrl}`;
        const cachedResponse = staticCache.get(cacheKey);
        
        if (cachedResponse) {
            res.set({
                'X-Cache': 'HIT',
                'Cache-Control': `public, max-age=${duration}`
            });
            return res.json(cachedResponse);
        }
        
        const originalJson = res.json;
        res.json = function(data) {
            staticCache.set(cacheKey, data, duration);
            res.set({
                'X-Cache': 'MISS',
                'Cache-Control': `public, max-age=${duration}`
            });
            return originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Conditional request handling (304 Not Modified)
 */
function handleConditionalRequests(req, res, next) {
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    // Simple ETag comparison
    if (ifNoneMatch && res.get('ETag') === ifNoneMatch) {
        return res.status(304).end();
    }
    
    // Simple Last-Modified comparison
    if (ifModifiedSince && res.get('Last-Modified')) {
        const modifiedSince = new Date(ifModifiedSince);
        const lastModified = new Date(res.get('Last-Modified'));
        
        if (lastModified <= modifiedSince) {
            return res.status(304).end();
        }
    }
    
    next();
}

module.exports = {
    staticCacheHeaders,
    cacheAnalyticsData,
    clearAnalyticsCache,
    cacheApiResponse,
    handleConditionalRequests,
    analyticsCache,
    staticCache
};