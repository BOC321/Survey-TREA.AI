/**
 * Error Handling Utilities
 * Provides centralized error handling and logging functionality
 */

/**
 * Error types for the survey application
 */
const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    NETWORK: 'NETWORK_ERROR',
    FILE_UPLOAD: 'FILE_UPLOAD_ERROR',
    DATA_PROCESSING: 'DATA_PROCESSING_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR'
};

/**
 * Custom error class for survey application
 */
class SurveyError extends Error {
    constructor(message, type = ERROR_TYPES.VALIDATION, details = null) {
        super(message);
        this.name = 'SurveyError';
        this.type = type;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Error logger utility
 */
class ErrorLogger {
    static log(error, context = {}) {
        const errorInfo = {
            message: error.message,
            type: error.type || 'UNKNOWN',
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Log to console in development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.error('Survey Application Error:', errorInfo);
        }
        
        // In production, you might want to send to an error tracking service
        // this.sendToErrorService(errorInfo);
    }
    
    static sendToErrorService(errorInfo) {
        // Implementation for sending errors to external service
        // e.g., Sentry, LogRocket, etc.
    }
}

/**
 * Retry utility for failed operations
 */
class RetryHandler {
    static async retry(operation, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    throw new SurveyError(
                        `Operation failed after ${maxAttempts} attempts: ${error.message}`,
                        ERROR_TYPES.NETWORK,
                        { originalError: error, attempts: maxAttempts }
                    );
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
}

/**
 * Network error handler
 */
class NetworkErrorHandler {
    static handleFetchError(error, url) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new SurveyError(
                'Network connection failed. Please check your internet connection.',
                ERROR_TYPES.NETWORK,
                { url, originalError: error }
            );
        }
        
        if (error.name === 'AbortError') {
            return new SurveyError(
                'Request was cancelled.',
                ERROR_TYPES.NETWORK,
                { url, originalError: error }
            );
        }
        
        return new SurveyError(
            'An unexpected network error occurred.',
            ERROR_TYPES.NETWORK,
            { url, originalError: error }
        );
    }
}

/**
 * Global error handler setup
 */
function setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        ErrorLogger.log(
            new SurveyError(
                'Unhandled promise rejection',
                ERROR_TYPES.DATA_PROCESSING,
                { reason: event.reason }
            )
        );
    });
    
    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
        ErrorLogger.log(
            new SurveyError(
                event.message,
                ERROR_TYPES.DATA_PROCESSING,
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                }
            )
        );
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ERROR_TYPES,
        SurveyError,
        ErrorLogger,
        RetryHandler,
        NetworkErrorHandler,
        setupGlobalErrorHandling
    };
}