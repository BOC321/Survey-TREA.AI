require('dotenv').config();
const path = require('path');
const fs = require('fs');
const merge = require('lodash.merge');


// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

// Load base and environment-specific configurations
const baseConfig = require('./base');
let envConfig = {};
try {
  envConfig = require(`./${NODE_ENV}`);
} catch (e) {
  if (NODE_ENV !== 'development') {
    logger.warn(`No specific configuration file found for environment: ${NODE_ENV}. Using development config as fallback.`);
  }
  envConfig = require('./development');
}

// Merge configurations
const config = merge({}, baseConfig, envConfig);

config.env = {
    isDevelopment,
    isProduction,
    isTest,
    NODE_ENV
};

// Configuration validation
const validateConfig = (cfg) => {
    const errors = [];
    
    // Validate required fields
    if (!cfg.app.name) {
        errors.push('Application name (app.name) is required');
    }

    if (!cfg.app.version) {
        errors.push('Application version (app.version) is required');
    }

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
    logger.error('Configuration validation errors:');
    configErrors.forEach(error => logger.error(`- ${error}`));
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
            logger.info(`Created directory: ${dir}`);
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
    get,
    validateConfig,
    ensureDirectories
};

// Initialize logger
const logger = require('../utils/logger');
logger.init(config);

// Log configuration on startup (excluding sensitive data)
if (!isTest) {
    logger.info('🔧 Configuration loaded:', {
        environment: NODE_ENV,
        port: config.app.port,
        host: config.app.host,
        logLevel: config.logging.level,
        corsOrigins: config.security.corsOrigins
    });
}