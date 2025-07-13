const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const fs = require('fs');
const crypto = require('crypto');

// Apply host validation fix early to prevent startup errors
require('./startup-host-fix');

// Import configuration and utilities
const logger = require('./utils/logger');
const config = require('./config');
const { apiLimiter, securityMiddleware, sanitizeInput } = require('./middleware/validation');
const { addNonce } = require('./middleware/security');
const { staticCacheHeaders, cacheApiResponse, handleConditionalRequests } = require('./middleware/caching');
const { notFoundResponse, requestTimer, globalErrorHandler } = require('./utils/apiResponse');

// Import route modules
const analyticsRoutes = require('./routes/analytics');
const { router: apiRoutes } = require('./routes/api');

const sharedRoutes = require('./routes/shared');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

const app = express();


// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const port = process.env.PORT || 3002;
const ENV = process.env.NODE_ENV || 'development';



app.use(addNonce);

// Content Security Policy
const cspDirectives = {
    directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`,
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com'
        ],
        'script-src-attr': ["'unsafe-inline'"], // Allow inline event handlers like onclick
        'style-src': [
            "'self'",
            "'unsafe-inline'", // Allow inline style attributes and <style> tags
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net'
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'http://localhost:3003', 'https://*.tile.openstreetmap.org'],
        'connect-src': [
            "'self'",
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com'
        ]
    }
};

app.use(helmet.contentSecurityPolicy(cspDirectives));

// CORS configuration
app.use(cors({
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging and timing
app.use(requestTimer);

// Add middleware to log 400 responses
app.use((req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
        if (res.statusCode === 400) {
            console.error('=== 400 BAD REQUEST ===');
            console.error('URL:', req.url);
            console.error('Method:', req.method);
            console.error('Headers:', req.headers);
            console.error('Body:', req.body);
            console.error('Response:', data);
            console.error('=====================');
        }
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        if (res.statusCode === 400) {
            console.error('=== 400 BAD REQUEST (JSON) ===');
            console.error('URL:', req.url);
            console.error('Method:', req.method);
            console.error('Headers:', req.headers);
            console.error('Body:', req.body);
            console.error('Response:', data);
            console.error('============================');
        }
        return originalJson.call(this, data);
    };
    
    next();
});

// Rate limiting and API caching
app.use('/api/', apiLimiter);
app.use('/api/', cacheApiResponse(300)); // 5 minutes cache for API responses

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Serve sw.js with no-cache headers
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Serve main page using EJS for nonce injection
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.render('index', { nonce: res.locals.nonce });
});


// Enhanced static file caching for other assets
app.use(staticCacheHeaders);
app.use(handleConditionalRequests);
app.use('/modules', express.static(path.join(__dirname, 'modules')));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: config.env.isProduction ? '31536000000' : 0, // 1 year in production
    etag: true,
    lastModified: true,
    immutable: config.env.isProduction
}));

// Mount route modules
app.use('/analytics', analyticsRoutes);
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', sharedRoutes);

// Global error handlers
app.use(notFoundResponse);
app.use(globalErrorHandler);

app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port} in ${ENV} mode`);
    logger.info(`API documentation available at http://localhost:${port}/api-docs`);
});