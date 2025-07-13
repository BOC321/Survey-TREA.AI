/**
 * @fileoverview Survey Application - Main Script
 * @description Core functionality for the survey application including validation, 
 * user interface management, and data handling.
 * @version 1.0.0
 * @author Survey Application Team
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {Object} FILE_UPLOAD - File upload validation settings
 * @property {number} FILE_UPLOAD.MAX_SIZE_MB - Maximum file size in MB
 * @property {number} FILE_UPLOAD.MAX_SIZE_BYTES - Maximum file size in bytes
 * @property {string[]} FILE_UPLOAD.ALLOWED_TYPES - Allowed MIME types
 * @property {Object} FILE_UPLOAD.MAX_DIMENSIONS - Maximum image dimensions
 * @property {number} FILE_UPLOAD.MAX_DIMENSIONS.WIDTH - Maximum width in pixels
 * @property {number} FILE_UPLOAD.MAX_DIMENSIONS.HEIGHT - Maximum height in pixels
 * @property {Object} MESSAGES - Validation error messages
 */

/**
 * @typedef {Object} UserResponses
 * @property {Object} intro - Introduction question responses
 * @property {Object} categorical - Categorical question responses
 */

/**
 * @typedef {Object} SurveyData
 * @property {string} title - Survey title
 * @property {string} introText - Introduction text
 * @property {Array} questions - Survey questions
 * @property {Array} categories - Survey categories
 * @property {Array} scoringRanges - Scoring ranges
 */