const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const crypto = require('crypto');

// Generate nonce for CSP
const generateNonce = () => {
    return crypto.randomBytes(16).toString('base64');
};

// Middleware to add nonce to response locals
const addNonce = (req, res, next) => {
    res.locals.nonce = generateNonce();
    next();
};

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message,
            error: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// General API rate limit
const apiLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later'
);

// Email sending rate limit
const emailLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 email requests per hour
    'Too many email requests from this IP, please try again later'
);

// PDF generation rate limit
const pdfLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // limit each IP to 20 PDF requests per 15 minutes
    'Too many PDF generation requests from this IP, please try again later'
);

// Input validation functions
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email is required and must be a string' };
    }
    
    if (!validator.isEmail(email)) {
        return { valid: false, message: 'Invalid email format' };
    }
    
    if (email.length > 254) {
        return { valid: false, message: 'Email address is too long' };
    }
    
    return { valid: true };
};

const validateSurveyTitle = (title) => {
    if (!title || typeof title !== 'string') {
        return { valid: false, message: 'Survey title is required and must be a string' };
    }
    
    if (title.length < 1 || title.length > 200) {
        return { valid: false, message: 'Survey title must be between 1 and 200 characters' };
    }
    
    // Sanitize title to prevent XSS
    const sanitized = validator.escape(title.trim());
    return { valid: true, sanitized };
};

const validateSurveyResults = (results) => {
    if (!results || typeof results !== 'object') {
        return { valid: false, message: 'Survey results are required and must be an object' };
    }
    
    const requiredFields = ['totalScore', 'maxPossibleScore', 'percentage', 'categoryScores'];
    for (const field of requiredFields) {
        if (!(field in results)) {
            return { valid: false, message: `Missing required field: ${field}` };
        }
    }
    
    // Validate numeric fields
    if (typeof results.totalScore !== 'number' || results.totalScore < 0) {
        return { valid: false, message: 'Total score must be a non-negative number' };
    }
    
    if (typeof results.maxPossibleScore !== 'number' || results.maxPossibleScore <= 0) {
        return { valid: false, message: 'Max possible score must be a positive number' };
    }
    
    if (typeof results.percentage !== 'number' || results.percentage < 0 || results.percentage > 100) {
        return { valid: false, message: 'Percentage must be a number between 0 and 100' };
    }
    
    if (!results.categoryScores || typeof results.categoryScores !== 'object') {
        return { valid: false, message: 'Category scores must be an object' };
    }
    
    return { valid: true };
};

const validateEmailConfig = (config) => {
    if (!config || typeof config !== 'object') {
        return { valid: false, message: 'Email configuration is required and must be an object' };
    }
    
    const { smtpServer, smtpPort, username, password } = config;
    
    if (!smtpServer || typeof smtpServer !== 'string') {
        return { valid: false, message: 'SMTP server is required and must be a string' };
    }
    
    if (!validator.isFQDN(smtpServer) && !validator.isIP(smtpServer)) {
        return { valid: false, message: 'SMTP server must be a valid domain or IP address' };
    }
    
    if (!smtpPort || !validator.isPort(String(smtpPort))) {
        return { valid: false, message: 'SMTP port must be a valid port number (1-65535)' };
    }
    
    const emailValidation = validateEmail(username);
    if (!emailValidation.valid) {
        return { valid: false, message: `Username validation failed: ${emailValidation.message}` };
    }
    
    if (!password || typeof password !== 'string' || password.length < 1) {
        return { valid: false, message: 'Password is required and must be a non-empty string' };
    }
    
    if (password.length > 1000) {
        return { valid: false, message: 'Password is too long' };
    }
    
    return { valid: true };
};

// Dynamic CSP middleware with nonce
const createCSPMiddleware = () => {
    return (req, res, next) => {
        const nonce = res.locals.nonce;
        
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'", 
                        `'nonce-${nonce}'`,
                        "https://fonts.googleapis.com"
                    ],
                    scriptSrc: [
                        "'self'", 
                        `'nonce-${nonce}'`,
                        "https://cdn.jsdelivr.net",
                        "https://cdnjs.cloudflare.com",
                        // SRI hashes for specific CDN resources
                        "'sha256-uQj9Jg+YnOGjTdJXRqRlUgbvP6xM6/M8LvXvOz3Qx8w='" // Chart.js 4.4.1
                    ],
                    imgSrc: ["'self'", "data:"],
                    connectSrc: [
                        "'self'",
                        "https://cdn.jsdelivr.net",
                        "https://cdnjs.cloudflare.com",
                        "https://fonts.googleapis.com",
                        "https://fonts.gstatic.com"
                    ],
                    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false
        })(req, res, next);
    };
};

// Security middleware array
const securityMiddleware = [addNonce, createCSPMiddleware()];

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
            return validator.escape(obj.trim());
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }
        return obj;
    };
    
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    
    next();
};

module.exports = {
    apiLimiter,
    emailLimiter,
    pdfLimiter,
    validateEmail,
    validateSurveyTitle,
    validateSurveyResults,
    validateEmailConfig,
    securityMiddleware,
    sanitizeInput,
    addNonce,
    generateNonce
};