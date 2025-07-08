const path = require('path');
const fs = require('fs');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

// Base configuration
const baseConfig = {
    app: {
        name: 'Survey Application',
        version: '1.0.0',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost'
    },
    
    security: {
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
        trustProxy: process.env.TRUST_PROXY === 'true',
        sessionSecret: process.env.SESSION_SECRET || 'survey-app-secret-key-change-in-production'
    },
    
    email: {
        configFile: './email-config.json',
        maxRetries: 3,
        retryDelay: 1000, // milliseconds
        timeout: 30000, // 30 seconds
        maxAttachmentSize: 25 * 1024 * 1024, // 25MB
        allowedDomains: process.env.ALLOWED_EMAIL_DOMAINS ? process.env.ALLOWED_EMAIL_DOMAINS.split(',') : null
    },
    
    pdf: {
        outputDir: './generated-pdfs',
        maxConcurrent: 3,
        timeout: 30000, // 30 seconds
        cleanupDelay: 300000, // 5 minutes
        puppeteerOptions: {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--run-all-compositor-stages-before-draw',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows'
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            timeout: 60000
        }
    },
    
    storage: {
        sharedResultsDir: './shared-results',
        logsDir: './logs',
        maxFileAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        emailWindowMs: 60 * 60 * 1000, // 1 hour
        maxEmailRequests: 10,
        pdfWindowMs: 15 * 60 * 1000, // 15 minutes
        maxPdfRequests: 20
    },
    
    logging: {
        level: 'info',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        datePattern: 'YYYY-MM-DD',
        enableConsole: true,
        enableFile: true
    }
};

// Development configuration
const developmentConfig = {
    ...baseConfig,
    
    logging: {
        ...baseConfig.logging,
        level: 'debug',
        enableConsole: true
    },
    
    security: {
        ...baseConfig.security,
        corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
    },
    
    pdf: {
        ...baseConfig.pdf,
        cleanupDelay: 60000 // 1 minute in development
    }
};

// Production configuration
const productionConfig = {
    ...baseConfig,
    
    logging: {
        ...baseConfig.logging,
        level: 'error',
        enableConsole: false
    },
    
    security: {
        ...baseConfig.security,
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
        trustProxy: true
    },
    
    rateLimit: {
        ...baseConfig.rateLimit,
        maxRequests: 50, // Stricter in production
        maxEmailRequests: 5,
        maxPdfRequests: 10
    }
};

// Test configuration
const testConfig = {
    ...baseConfig,
    
    app: {
        ...baseConfig.app,
        port: 0 // Random port for testing
    },
    
    logging: {
        ...baseConfig.logging,
        level: 'silent',
        enableConsole: false,
        enableFile: false
    },
    
    email: {
        ...baseConfig.email,
        configFile: './test-email-config.json'
    },
    
    pdf: {
        ...baseConfig.pdf,
        outputDir: './test-generated-pdfs',
        cleanupDelay: 1000 // 1 second in tests
    },
    
    storage: {
        ...baseConfig.storage,
        sharedResultsDir: './test-shared-results',
        logsDir: './test-logs'
    }
};

// Select configuration based on environment
let config;
switch (NODE_ENV) {
    case 'production':
        config = productionConfig;
        break;
    case 'test':
        config = testConfig;
        break;
    case 'development':
    default:
        config = developmentConfig;
        break;
}

// Configuration validation
const validateConfig = (cfg) => {
    const errors = [];
    
    // Validate required fields
    if (!cfg.app.port || cfg.app.port < 1 || cfg.app.port > 65535) {
        errors.push('Invalid port number');
    }
    
    if (!cfg.security.sessionSecret || cfg.security.sessionSecret.length < 32) {
        errors.push('Session secret must be at least 32 characters long');
    }
    
    if (cfg.email.maxRetries < 1 || cfg.email.maxRetries > 10) {
        errors.push('Email max retries must be between 1 and 10');
    }
    
    if (cfg.pdf.timeout < 5000 || cfg.pdf.timeout > 120000) {
        errors.push('PDF timeout must be between 5 and 120 seconds');
    }
    
    return errors;
};

// Validate current configuration
const configErrors = validateConfig(config);
if (configErrors.length > 0) {
    console.error('Configuration validation errors:');
    configErrors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
}

// Ensure required directories exist
const ensureDirectories = () => {
    const dirs = [
        config.pdf.outputDir,
        config.storage.sharedResultsDir,
        config.storage.logsDir
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

// Initialize directories
ensureDirectories();

// Configuration getter with path support
const get = (path, defaultValue = undefined) => {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
};

// Environment helpers
const env = {
    isDevelopment,
    isProduction,
    isTest,
    NODE_ENV
};

// Export configuration
module.exports = {
    ...config,
    env,
    get,
    validateConfig,
    ensureDirectories
};

// Log configuration on startup (excluding sensitive data)
if (!isTest) {
    console.log('🔧 Configuration loaded:', {
        environment: NODE_ENV,
        port: config.app.port,
        host: config.app.host,
        logLevel: config.logging.level,
        corsOrigins: config.security.corsOrigins
    });
}