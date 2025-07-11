// Security Validation Module
// Provides comprehensive input validation and XSS protection

class SecurityValidator {
    constructor() {
        this.config = window.AnalyticsConfig || {};
        
        // XSS protection patterns
        this.xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /<object[^>]*>.*?<\/object>/gi,
            /<embed[^>]*>/gi,
            /<link[^>]*>/gi,
            /<meta[^>]*>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload=/gi,
            /onerror=/gi,
            /onclick=/gi,
            /onmouseover=/gi,
            /onfocus=/gi,
            /onblur=/gi,
            /onchange=/gi,
            /onsubmit=/gi
        ];
        
        // Allowed HTML tags for safe rendering
        this.allowedTags = ['b', 'i', 'em', 'strong', 'span', 'div', 'p', 'br'];
        
        // Date validation patterns
        this.datePatterns = {
            iso: /^\d{4}-\d{2}-\d{2}$/,
            us: /^\d{2}\/\d{2}\/\d{4}$/,
            timestamp: /^\d{13}$/
        };
    }

    // Validate and sanitize text input
    sanitizeText(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove XSS patterns
        let sanitized = input;
        this.xssPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        // Encode HTML entities
        sanitized = this.encodeHtmlEntities(sanitized);
        
        return sanitized.trim();
    }

    // Encode HTML entities to prevent XSS
    encodeHtmlEntities(text) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        
        return String(text).replace(/[&<>"'\/]/g, (char) => entityMap[char]);
    }

    // Validate email address with enhanced security
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return {
                isValid: false,
                error: 'Email is required and must be a string'
            };
        }
        
        // Basic format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                error: 'Invalid email format'
            };
        }
        
        // Length validation
        if (email.length > 254) {
            return {
                isValid: false,
                error: 'Email address is too long'
            };
        }
        
        // Local part validation (before @)
        const [localPart, domain] = email.split('@');
        if (localPart.length > 64) {
            return {
                isValid: false,
                error: 'Email local part is too long'
            };
        }
        
        // Domain validation
        if (domain.length > 253) {
            return {
                isValid: false,
                error: 'Email domain is too long'
            };
        }
        
        // Check for dangerous patterns
        const dangerousPatterns = [
            /[<>"']/,
            /javascript:/i,
            /data:/i,
            /vbscript:/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(email)) {
                return {
                    isValid: false,
                    error: 'Email contains invalid characters'
                };
            }
        }
        
        return {
            isValid: true,
            sanitized: email.toLowerCase().trim()
        };
    }

    // Validate date range with security checks
    validateDateRange(startDate, endDate) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: {}
        };
        
        // Validate start date
        const startValidation = this.validateDate(startDate, 'Start date');
        if (!startValidation.isValid) {
            result.isValid = false;
            result.errors.push(startValidation.error);
        } else {
            result.sanitized.startDate = startValidation.sanitized;
        }
        
        // Validate end date
        const endValidation = this.validateDate(endDate, 'End date');
        if (!endValidation.isValid) {
            result.isValid = false;
            result.errors.push(endValidation.error);
        } else {
            result.sanitized.endDate = endValidation.sanitized;
        }
        
        // Check date range logic
        if (result.isValid) {
            const start = new Date(result.sanitized.startDate);
            const end = new Date(result.sanitized.endDate);
            
            if (start > end) {
                result.isValid = false;
                result.errors.push('Start date must be before end date');
            }
            
            // Check for reasonable date range (not more than 10 years)
            const maxRangeMs = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
            if (end - start > maxRangeMs) {
                result.isValid = false;
                result.errors.push('Date range is too large (maximum 10 years)');
            }
            
            // Check for future dates beyond reasonable limit
            const futureLimit = new Date();
            futureLimit.setFullYear(futureLimit.getFullYear() + 1);
            if (end > futureLimit) {
                result.isValid = false;
                result.errors.push('End date cannot be more than 1 year in the future');
            }
        }
        
        return result;
    }

    // Validate individual date
    validateDate(dateInput, fieldName = 'Date') {
        if (!dateInput) {
            return {
                isValid: false,
                error: `${fieldName} is required`
            };
        }
        
        // Sanitize input
        const sanitized = this.sanitizeText(String(dateInput));
        
        // Try to parse as Date
        const date = new Date(sanitized);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return {
                isValid: false,
                error: `${fieldName} is not a valid date`
            };
        }
        
        // Check for reasonable date range (not before 1900, not more than 100 years in future)
        const minDate = new Date('1900-01-01');
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 100);
        
        if (date < minDate || date > maxDate) {
            return {
                isValid: false,
                error: `${fieldName} must be between 1900 and ${maxDate.getFullYear()}`
            };
        }
        
        return {
            isValid: true,
            sanitized: date.toISOString().split('T')[0] // Return YYYY-MM-DD format
        };
    }

    // Validate score range
    validateScoreRange(scoreRange) {
        if (!scoreRange || typeof scoreRange !== 'string') {
            return {
                isValid: false,
                error: 'Score range is required'
            };
        }
        
        const sanitized = this.sanitizeText(scoreRange);
        
        // Define allowed score range values
        const allowedRanges = ['all', 'high', 'medium', 'low', '0-20', '21-40', '41-60', '61-80', '81-100'];
        
        if (!allowedRanges.includes(sanitized)) {
            return {
                isValid: false,
                error: 'Invalid score range value'
            };
        }
        
        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    // Validate survey version
    validateSurveyVersion(version) {
        if (!version) {
            return {
                isValid: true,
                sanitized: 'all'
            };
        }
        
        const sanitized = this.sanitizeText(String(version));
        
        // Check for reasonable version format
        if (sanitized !== 'all' && !/^[a-zA-Z0-9._-]+$/.test(sanitized)) {
            return {
                isValid: false,
                error: 'Invalid survey version format'
            };
        }
        
        // Limit length
        if (sanitized.length > 50) {
            return {
                isValid: false,
                error: 'Survey version is too long'
            };
        }
        
        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    // Validate file upload (for future use)
    validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
        if (!file) {
            return {
                isValid: false,
                error: 'No file provided'
            };
        }
        
        // Check file size
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: `File size exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`
            };
        }
        
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
            };
        }
        
        // Check file name for dangerous patterns
        const dangerousPatterns = [
            /\.\.\//,  // Path traversal
            /[<>"']/,  // HTML/script injection
            /\.(exe|bat|cmd|scr|pif|com)$/i  // Executable files
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(file.name)) {
                return {
                    isValid: false,
                    error: 'File name contains invalid characters or dangerous file type'
                };
            }
        }
        
        return {
            isValid: true,
            sanitized: {
                name: this.sanitizeText(file.name),
                type: file.type,
                size: file.size
            }
        };
    }

    // Safe HTML rendering for dynamic content
    renderSafeHtml(content, allowedTags = null) {
        if (!content || typeof content !== 'string') {
            return '';
        }
        
        const tags = allowedTags || this.allowedTags;
        
        // First sanitize the content
        let sanitized = this.sanitizeText(content);
        
        // Then allow specific safe tags
        tags.forEach(tag => {
            const openTagPattern = new RegExp(`&lt;${tag}&gt;`, 'gi');
            const closeTagPattern = new RegExp(`&lt;\/${tag}&gt;`, 'gi');
            
            sanitized = sanitized.replace(openTagPattern, `<${tag}>`);
            sanitized = sanitized.replace(closeTagPattern, `</${tag}>`);
        });
        
        return sanitized;
    }

    // Validate all filter inputs at once
    validateFilters(filters) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: {}
        };
        
        // Validate date range
        if (filters.startDate || filters.endDate) {
            const dateValidation = this.validateDateRange(filters.startDate, filters.endDate);
            if (!dateValidation.isValid) {
                result.isValid = false;
                result.errors.push(...dateValidation.errors);
            } else {
                result.sanitized.startDate = dateValidation.sanitized.startDate;
                result.sanitized.endDate = dateValidation.sanitized.endDate;
            }
        }
        
        // Validate score range
        if (filters.scoreRange) {
            const scoreValidation = this.validateScoreRange(filters.scoreRange);
            if (!scoreValidation.isValid) {
                result.isValid = false;
                result.errors.push(scoreValidation.error);
            } else {
                result.sanitized.scoreRange = scoreValidation.sanitized;
            }
        }
        
        // Validate survey version
        if (filters.surveyVersion) {
            const versionValidation = this.validateSurveyVersion(filters.surveyVersion);
            if (!versionValidation.isValid) {
                result.isValid = false;
                result.errors.push(versionValidation.error);
            } else {
                result.sanitized.surveyVersion = versionValidation.sanitized;
            }
        }
        
        return result;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityValidator;
} else {
    window.SecurityValidator = SecurityValidator;
}