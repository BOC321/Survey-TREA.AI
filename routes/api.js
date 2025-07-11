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
const emailService = require('../services/emailService');

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
    const services = {
        email: emailService.emailConfig.host ? 'configured' : 'not-configured',
        storage: fs.existsSync(config.storage.sharedResultsDir) ? 'available' : 'unavailable',
        pdf: 'available'
    };
    
    return healthCheckResponse(res, services);
}));

// Configure email settings
router.post('/configure-email', asyncHandler(async (req, res) => {
    const { smtpServer, smtpPort, username, password } = req.body;
    
    // Validate input
    const validation = validateEmailConfig({ smtpServer, smtpPort, username, password });
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
    if (emailService.saveEmailConfig(newConfig)) {
        emailService.updateEmailConfig(newConfig);
        return successResponse(res, null, 'Email configuration saved successfully and persisted to disk');
    } else {
        return internalServerErrorResponse(res, 'Failed to save email configuration to disk');
    }
}));

// Get current email configuration status
router.get('/email-config-status', asyncHandler(async (req, res) => {
    const isConfigured = emailService.emailConfig.host && emailService.emailConfig.auth.user;
    const configStatus = {
        configured: isConfigured,
        host: emailService.emailConfig.host || '',
        port: emailService.emailConfig.port || 587,
        username: emailService.emailConfig.auth.user || '',
        hasPassword: !!emailService.emailConfig.auth.pass,
        configFile: fs.existsSync(config.email.configFile)
    };
    
    return successResponse(res, configStatus, 'Email configuration status retrieved successfully');
}));

// Test email configuration
router.post('/test-email', emailLimiter, asyncHandler(async (req, res) => {
    if (!emailService.emailConfig.host || !emailService.emailConfig.auth.user) {
        return badRequestResponse(res, 'Email not configured');
    }
    
    const transporter = nodemailer.createTransport({
        ...emailService.emailConfig,
        connectionTimeout: config.email.timeout,
        greetingTimeout: config.email.timeout,
        socketTimeout: config.email.timeout
    });
    
    // Verify connection with timeout
    await transporter.verify();
    
    return successResponse(res, null, 'Email configuration is valid');
}));

// Import and use survey routes
const { router: surveyRoutes } = require('./survey');
router.use(surveyRoutes);

module.exports = { router };