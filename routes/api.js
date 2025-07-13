const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const router = express.Router();

// Import utilities and middleware
const config = require('../config');
const {
    emailLimiter,
    pdfLimiter,
    validateEmail,
    validateSurveyTitle,
    validateSurveyResults,
    validateEmailConfig
} = require('../middleware/validation');
const {
    successResponse,
    createdResponse,
    badRequestResponse,
    notFoundResponse,
    internalServerErrorResponse,
    validationErrorResponse,
    asyncHandler,
    healthCheckResponse
} = require('../utils/apiResponse');

// Import email service
const { getConfig, updateConfig } = require('../services/configService');
const { getEmailConfig, updateEmailConfig } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * @route GET /api/health
 * @group Health - API Health Status
 * @returns {object} 200 - An object indicating the status of various services
 * @returns {Error} 500 - Internal Server Error
 */
router.get('/health', asyncHandler(async (req, res) => {
    const currentEmailConfig = getEmailConfig();
    const services = {
        email: currentEmailConfig.host ? 'configured' : 'not-configured',
        storage: fs.existsSync(config.storage.sharedResultsDir) ? 'available' : 'unavailable',
        pdf: 'available'
    };
    
    return healthCheckResponse(res, services);
}));

/**
 * @route POST /api/configure-email
 * @group Email - Email Configuration
 * @param {string} smtpServer.body.required - The SMTP server address
 * @param {number} smtpPort.body.required - The SMTP server port
 * @param {string} username.body.required - The email account username
 * @param {string} password.body.required - The email account password
 * @returns {object} 200 - Email configuration saved successfully
 * @returns {Error} 400 - Bad Request or validation error
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/configure-email', asyncHandler(async (req, res) => {
    logger.info('Received request to configure email');
    logger.info('Request body:', req.body);
    const { smtpServer, smtpPort, username, password } = req.body;
    
    // Validate input
    const validation = validateEmailConfig(req.body);
    if (!validation.valid) {
        return validationErrorResponse(res, [validation.message]);
    }
    
    const newConfig = {
        host: smtpServer,
        port: parseInt(smtpPort) || 587,
        secure: parseInt(smtpPort) === 465,
        auth: {
            user: username,
            pass: password
        }
    };
    
    // Test the configuration before saving
    try {
        const testTransporter = nodemailer.createTransport(newConfig);
        await testTransporter.verify();
    } catch (testError) {
        return badRequestResponse(res, `Email configuration test failed: ${testError.message}`);
    }
    
    // Save to file
    try {
        updateEmailConfig(newConfig);
        logger.info('Email configuration updated successfully');
        return successResponse(res, null, 'Email configuration saved successfully and persisted to disk');
    } catch (error) {
        logger.error('Failed to save email configuration', { message: error.message });
        return internalServerErrorResponse(res, 'Failed to save email configuration to disk');
    }
}));

/**
 * @route GET /api/email-config
 * @group Email - Email Configuration
 * @returns {object} 200 - An object containing the current email configuration
 * @returns {Error} 500 - Internal Server Error
 */
router.get('/email-config', asyncHandler(async (req, res) => {
    const currentEmailConfig = getEmailConfig();
    const isConfigured = !!(currentEmailConfig.host && currentEmailConfig.auth.user);
    
    if (isConfigured) {
        return successResponse(res, { 
            config: currentEmailConfig,
            emailConfig: currentEmailConfig,
            configured: true
        }, 'Email configuration retrieved successfully');
    } else {
        return successResponse(res, { 
            config: null,
            emailConfig: null,
            configured: false
        }, 'Email configuration not found');
    }
}));

/**
 * @route GET /api/email-config-status
 * @group Email - Email Configuration
 * @returns {object} 200 - An object containing the current email configuration status
 * @returns {Error} 500 - Internal Server Error
 */
router.get('/email-config-status', asyncHandler(async (req, res) => {
    const currentEmailConfig = getEmailConfig();
    const isConfigured = currentEmailConfig.host && currentEmailConfig.auth.user;
    const configStatus = {
        configured: isConfigured,
        host: currentEmailConfig.host || '',
        port: currentEmailConfig.port || 587,
        username: currentEmailConfig.auth.user || '',
        hasPassword: !!currentEmailConfig.auth.pass,
        configFile: fs.existsSync(config.email.configFile)
    };
    
    return successResponse(res, configStatus, 'Email configuration status retrieved successfully');
}));

/**
 * @route POST /api/test-email
 * @group Email - Email Configuration
 * @returns {object} 200 - Email configuration is valid
 * @returns {Error} 400 - Bad Request or email not configured
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/test-email', emailLimiter, asyncHandler(async (req, res) => {
    const currentEmailConfig = getEmailConfig();
    if (!currentEmailConfig.host || !currentEmailConfig.auth.user) {
        return badRequestResponse(res, 'Email not configured');
    }
    
    const transporter = nodemailer.createTransport({
        ...currentEmailConfig,
        connectionTimeout: config.email.timeout,
        greetingTimeout: config.email.timeout,
        socketTimeout: config.email.timeout
    });
    
    // Verify connection with timeout
    await transporter.verify();
    
    return successResponse(res, null, 'Email configuration is valid');
}));

/**
 * @route GET /api/email-template
 * @group Email - Email Template Configuration
 * @returns {object} 200 - An object containing the current email template configuration
 * @returns {Error} 500 - Internal Server Error
 */
router.get('/email-template', asyncHandler(async (req, res) => {
    const currentConfig = getConfig();
    const emailTemplate = currentConfig.emailTemplate || {
        backgroundColor: '#ffffff',
        headerImage: '',
        footerImage: '',
        headerText: 'Survey Results Report',
        includeIntroQuestions: true,
        includeCategoryScores: true,
        includeCategoryDescriptions: true,
        includeOverallScore: true,
        customSections: []
    };
    
    return successResponse(res, { emailTemplate }, 'Email template configuration retrieved successfully');
}));

/**
 * @route POST /api/email-template
 * @group Email - Email Template Configuration
 * @param {object} emailTemplate.body.required - The email template configuration object
 * @returns {object} 200 - Email template configuration saved successfully
 * @returns {Error} 400 - Bad Request or validation error
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/email-template', asyncHandler(async (req, res) => {
    logger.info('Received request to save email template configuration');
    const { emailTemplate } = req.body;
    
    // Basic validation
    if (!emailTemplate || typeof emailTemplate !== 'object') {
        return badRequestResponse(res, 'Email template configuration is required and must be an object');
    }
    
    // Validate required fields
    const requiredFields = ['backgroundColor', 'headerText'];
    for (const field of requiredFields) {
        if (emailTemplate[field] === undefined) {
            return badRequestResponse(res, `Missing required field: ${field}`);
        }
    }
    
    // Save to persistent storage
    try {
        const configUpdate = { emailTemplate };
        updateConfig(configUpdate);
        logger.info('Email template configuration saved successfully');
        return successResponse(res, { emailTemplate }, 'Email template configuration saved successfully');
    } catch (error) {
        logger.error('Failed to save email template configuration', { message: error.message });
        return internalServerErrorResponse(res, 'Failed to save email template configuration');
    }
}));

// Import and use survey routes
const { router: surveyRoutes } = require('./survey');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/save-basic-settings', upload.single('banner'), asyncHandler(async (req, res) => {
    logger.info('Received request to save basic settings.');
    logger.debug('Request body:', req.body);
    logger.debug('Request file:', req.file);
    
    const { title } = req.body;
    let bannerUrl;

    if (req.file) {
        bannerUrl = `/uploads/${req.file.filename}`;
    }

    const configUpdate = {
        email: {
            title: title,
        }
    };

    if (bannerUrl) {
        configUpdate.email.banner = bannerUrl;
    }

    logger.debug('Attempting to update config with:', configUpdate);
    updateConfig(configUpdate);
    logger.info('Config updated successfully.');

    const finalBannerUrl = (getConfig()).email.banner;

    return successResponse(res, { success: true, bannerUrl: finalBannerUrl }, 'Basic settings saved successfully.');
}));

router.use(surveyRoutes);

module.exports = { router };