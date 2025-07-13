const fs = require('fs');
const path = require('path');

// Standardized API response format
const createApiResponse = (success, data = null, message = '', errors = null, meta = null) => {
    const response = {
        success,
        timestamp: new Date().toISOString(),
        message
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    if (errors !== null) {
        response.errors = errors;
    }
    
    if (meta !== null) {
        response.meta = meta;
    }
    
    return response;
};

// Success response helpers
const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
    return res.status(statusCode).json(createApiResponse(true, data, message, null, meta));
};

const createdResponse = (res, data = null, message = 'Resource created successfully') => {
    return successResponse(res, data, message, 201);
};

// Error response helpers
const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null, data = null) => {
    return res.status(statusCode).json(createApiResponse(false, data, message, errors));
};

const badRequestResponse = (res, message = 'Bad request', errors = null) => {
    return errorResponse(res, message, 400, errors);
};

const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return errorResponse(res, message, 401);
};

const forbiddenResponse = (res, message = 'Forbidden') => {
    return errorResponse(res, message, 403);
};

const notFoundResponse = (res, message = 'Resource not found') => {
    return errorResponse(res, message, 404);
};

const conflictResponse = (res, message = 'Conflict') => {
    return errorResponse(res, message, 409);
};

const validationErrorResponse = (res, errors, message = 'Validation failed') => {
    return badRequestResponse(res, message, errors);
};

const internalServerErrorResponse = (res, message = 'Internal server error', error = null) => {
    // Log the actual error for debugging
    if (error) {
        console.error('Internal Server Error:', error);
        logError(error);
    }
    
    // Don't expose internal error details in production
    const publicMessage = process.env.NODE_ENV === 'production' 
        ? 'An internal error occurred. Please try again later.'
        : message;
    
    return errorResponse(res, publicMessage, 500);
};

// Error logging utility
const logError = (error, context = {}) => {
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        context,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };
    
    // Ensure logs directory exists
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write to error log file
    const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = JSON.stringify(errorLog) + '\n';
    
    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            console.error('Failed to write to error log:', err);
        }
    });
    
    // Also log to console
    console.error('Error logged:', {
        message: error.message,
        timestamp: errorLog.timestamp,
        context
    });
};

// Request logging utility
const logRequest = (req, res, responseTime) => {
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length') || 0
    };
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${requestLog.method} ${requestLog.url} - ${requestLog.statusCode} - ${requestLog.responseTime}`);
    }
    
    // Write to access log file
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, `access-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = JSON.stringify(requestLog) + '\n';
    
    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            console.error('Failed to write to access log:', err);
        }
    });
};

// Request timing middleware
const requestTimer = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logRequest(req, res, responseTime);
    });
    
    next();
};

// Global error handler middleware
const globalErrorHandler = (error, req, res, next) => {
    // Enhanced error context
    const errorContext = {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers
    };
    
    // Log the error with enhanced context
    logError(error, errorContext);
    
    // Console log for immediate debugging
    console.error('=== ERROR HANDLER ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Request:', `${req.method} ${req.url}`);
    console.error('Status Code:', error.statusCode || 500);
    console.error('Error Type:', error.name);
    console.error('===================');
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
        console.log('Validation Error - returning 400');
        return validationErrorResponse(res, error.errors, error.message);
    }
    
    if (error.name === 'CastError') {
        console.log('Cast Error - returning 400');
        return badRequestResponse(res, 'Invalid data format');
    }
    
    if (error.code === 'ENOENT') {
        console.log('File Not Found Error - returning 404');
        return notFoundResponse(res, 'File not found');
    }
    
    if (error.code === 'EACCES') {
        console.log('Access Denied Error - returning 403');
        return forbiddenResponse(res, 'Access denied');
    }
    
    // Default to internal server error
    console.log('Unhandled Error - returning 500');
    return internalServerErrorResponse(res, error.message, error);
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Health check response
const healthCheckResponse = (res, services = {}) => {
    const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: process.version,
        services
    };
    
    return successResponse(res, health, 'Service is healthy');
};

module.exports = {
    createApiResponse,
    successResponse,
    createdResponse,
    errorResponse,
    badRequestResponse,
    unauthorizedResponse,
    forbiddenResponse,
    notFoundResponse,
    conflictResponse,
    validationErrorResponse,
    internalServerErrorResponse,
    logError,
    logRequest,
    requestTimer,
    globalErrorHandler,
    asyncHandler,
    healthCheckResponse
};