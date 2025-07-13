/**
 * Validation Utilities Module
 * Provides reusable validation functions and configuration
 */

// Validation configuration constants
const VALIDATION_CONFIG = {
    FILE_UPLOAD: {
        MAX_SIZE_MB: 10,
        MAX_SIZE_BYTES: 10 * 1024 * 1024,
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        MAX_DIMENSIONS: {
            WIDTH: 4000,
            HEIGHT: 2000
        }
    },
    MESSAGES: {
        INVALID_FILE_TYPE: 'Please select a valid image file (JPEG, PNG, GIF, WebP)',
        FILE_TOO_LARGE: 'File size must be less than 10MB',
        DIMENSIONS_TOO_LARGE: 'Image dimensions must be less than 4000x2000 pixels',
        INVALID_IMAGE: 'Invalid image file',
        TITLE_REQUIRED: 'Survey title is required'
    }
};

/**
 * Validates file type against allowed types
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateFileType(file) {
    return VALIDATION_CONFIG.FILE_UPLOAD.ALLOWED_TYPES.includes(file.type);
}

/**
 * Validates file size against maximum allowed size
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateFileSize(file) {
    return file.size <= VALIDATION_CONFIG.FILE_UPLOAD.MAX_SIZE_BYTES;
}

/**
 * Validates image dimensions
 * @param {HTMLImageElement} img - The loaded image element
 * @returns {boolean} - True if valid, false otherwise
 */
function validateImageDimensions(img) {
    const { WIDTH: maxWidth, HEIGHT: maxHeight } = VALIDATION_CONFIG.FILE_UPLOAD.MAX_DIMENSIONS;
    return img.width <= maxWidth && img.height <= maxHeight;
}

/**
 * Creates an image object from a file and loads it
 * @param {File} file - The file to load as image
 * @returns {Promise<HTMLImageElement>} - Promise that resolves with loaded image
 */
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = function() {
            URL.revokeObjectURL(objectUrl);
            resolve(this);
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        
        img.src = objectUrl;
    });
}

/**
 * Comprehensive file upload validation
 * @param {HTMLInputElement} input - The file input element
 * @returns {Promise<boolean>} - Promise that resolves with validation result
 */
async function validateFileUpload(input) {
    const file = input.files[0];
    const errorElement = document.getElementById(input.id + '-error');
    
    // Clear previous error
    clearValidationError(input, errorElement);
    
    if (!file) {
        return true; // No file selected is valid
    }
    
    // Validate file type
    if (!validateFileType(file)) {
        showValidationError(input, errorElement, VALIDATION_CONFIG.MESSAGES.INVALID_FILE_TYPE);
        return false;
    }
    
    // Validate file size
    if (!validateFileSize(file)) {
        showValidationError(input, errorElement, VALIDATION_CONFIG.MESSAGES.FILE_TOO_LARGE);
        return false;
    }
    
    // Validate image dimensions
    try {
        const img = await loadImageFromFile(file);
        if (!validateImageDimensions(img)) {
            showValidationError(input, errorElement, VALIDATION_CONFIG.MESSAGES.DIMENSIONS_TOO_LARGE);
            return false;
        }
        return true;
    } catch (error) {
        showValidationError(input, errorElement, VALIDATION_CONFIG.MESSAGES.INVALID_IMAGE);
        return false;
    }
}

/**
 * Shows validation error message
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error display element
 * @param {string} message - The error message
 */
function showValidationError(input, errorElement, message) {
    if (input) input.classList.add('invalid');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Clears validation error message
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error display element
 */
function clearValidationError(input, errorElement) {
    if (input) input.classList.remove('invalid');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Wrapper function for HTML onchange events
 * @param {HTMLInputElement} input - The file input element
 */
function handleFileUploadChange(input) {
    validateFileUpload(input)
        .then(isValid => {
            // The validation result is handled by the Promise
            // Error messages are already displayed by the validation function
        })
        .catch(error => {
            console.error('Validation error:', error);
        });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VALIDATION_CONFIG,
        validateFileType,
        validateFileSize,
        validateImageDimensions,
        loadImageFromFile,
        validateFileUpload,
        showValidationError,
        clearValidationError,
        handleFileUploadChange
    };
}