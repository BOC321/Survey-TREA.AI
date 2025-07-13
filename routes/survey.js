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
    validateSurveyResults
} = require('../middleware/validation');
const {
    successResponse,
    badRequestResponse,
    notFoundResponse,
    internalServerErrorResponse,
    validationErrorResponse,
    asyncHandler
} = require('../utils/apiResponse');

// Import email service
const { getEmailConfig } = require('../services/emailService');
const { getConfig } = require('../services/configService');
const logger = require('../utils/logger');

// Import caching functions
const { clearAnalyticsCache } = require('../middleware/caching');

// Additional security validation functions
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    // Remove potential XSS patterns and limit length
    return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .trim()
        .substring(0, 1000); // Limit input length
}

function validateSurveyResultsStructure(results) {
    if (!results || typeof results !== 'object') {
        return false;
    }
    
    // Validate score
    if (typeof results.totalScore !== 'number' || results.totalScore < 0) {
        return false;
    }
    
    // Validate percentage
    if (typeof results.percentage !== 'number' || results.percentage < 0 || results.percentage > 100) {
        return false;
    }
    
    // Validate categoryScores if present
    if (results.categoryScores && typeof results.categoryScores !== 'object') {
        return false;
    }
    
    return true;
}

/**
 * @route GET /api/survey-data
 * @group Survey - Survey Data
 * @returns {object} 200 - The survey data
 * @returns {Error} 500 - Internal Server Error
 */
router.get('/survey-data', (req, res) => {
    const surveyDataPath = path.join(__dirname, '..', 'survey-data.json');
    fs.readFile(surveyDataPath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading survey data file:', err);
            return internalServerErrorResponse(res, 'Failed to load survey data');
        }
        try {
            const surveyData = JSON.parse(data);
            const emailConfig = getEmailConfig();
            const appConfig = getConfig();
            
            // Include email settings
            surveyData.emailSettings = emailConfig;
            
            // Include banner and title from config if available
            if (appConfig.email && appConfig.email.banner) {
                surveyData.banner = appConfig.email.banner;
            }
            if (appConfig.email && appConfig.email.title) {
                surveyData.title = appConfig.email.title;
            }
            
            res.json(surveyData);
        } catch (parseError) {
            logger.error('Error parsing survey data JSON:', parseError);
            return internalServerErrorResponse(res, 'Failed to parse survey data');
        }
    });
});

/**
 * @route POST /api/save-survey-data
 * @group Survey - Survey Data
 * @param {object} surveyData.body.required - The complete survey data object
 * @returns {object} 200 - Survey data saved successfully
 * @returns {Error} 400 - Bad Request or validation error
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/save-survey-data', asyncHandler(async (req, res) => {
    logger.info('Received request to save survey data');
    const { surveyData } = req.body;
    
    if (!surveyData || typeof surveyData !== 'object') {
        return badRequestResponse(res, 'Invalid survey data provided');
    }
    
    const surveyDataPath = path.join(__dirname, '..', 'survey-data.json');
    
    try {
        // Read existing data first
        let existingData = {};
        if (fs.existsSync(surveyDataPath)) {
            const existingDataRaw = fs.readFileSync(surveyDataPath, 'utf8');
            existingData = JSON.parse(existingDataRaw);
        }
        
        // Merge the data, preserving existing structure but updating with new data
        const updatedData = { ...existingData, ...surveyData };
        
        // Write the updated data back to file
        fs.writeFileSync(surveyDataPath, JSON.stringify(updatedData, null, 2));
        
        logger.info('Survey data saved successfully');
        return successResponse(res, null, 'Survey data saved successfully');
    } catch (error) {
        logger.error('Failed to save survey data:', error);
        return internalServerErrorResponse(res, 'Failed to save survey data');
    }
}));

// Email results as PDF attachment route
router.post('/email-results-pdf', emailLimiter, asyncHandler(async (req, res) => {
    console.log('🚀 === EMAIL PDF ROUTE CALLED ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Survey title:', req.body.surveyTitle);
    console.log('Recipient email:', req.body.recipientEmail);
    console.log('Results structure:', req.body.results ? 'present' : 'missing');
    console.log('================================');
    
    logger.info('Received request to email survey results as PDF attachment');
    const { results, surveyTitle, recipientEmail } = req.body;
    const emailConfig = getEmailConfig();
    
    // Validate email configuration
    if (!emailConfig.host || !emailConfig.auth.user) {
        logger.error('Email not configured, aborting send.');
        return badRequestResponse(res, 'Email not configured');
    }
    
    // Validate required fields
    if (!results || !surveyTitle || !recipientEmail) {
        return badRequestResponse(res, 'Missing required data: results, surveyTitle, and recipientEmail are required');
    }
    
    // Validate survey title
    const titleValidation = validateSurveyTitle(surveyTitle);
    if (!titleValidation.valid) {
        return validationErrorResponse(res, [titleValidation.message]);
    }
    
    // Validate survey results
    const resultsValidation = validateSurveyResults(results);
    if (!resultsValidation.valid) {
        return validationErrorResponse(res, [resultsValidation.message]);
    }
    
    // Validate email format
    const emailValidation = validateEmail(recipientEmail);
    if (!emailValidation.valid) {
        return validationErrorResponse(res, [emailValidation.message]);
    }
    
    // Additional security validation
    if (!validateSurveyResultsStructure(results)) {
        return badRequestResponse(res, 'Invalid survey results structure');
    }
    
    console.log('📧 Generating PDF attachment for email...');
    
    try {
        // Load survey data to get banner image
        let bannerImage = null;
        const surveyDataPath = path.join(__dirname, '..', 'survey-data.json');
        if (fs.existsSync(surveyDataPath)) {
            try {
                const surveyDataRaw = fs.readFileSync(surveyDataPath, 'utf8');
                const surveyData = JSON.parse(surveyDataRaw);
                bannerImage = surveyData.banner || null;
            } catch (error) {
                logger.warn('Failed to load survey data for banner image:', error);
            }
        }
        
        // Generate PDF using existing PDF generation logic with email template
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        console.log('🎨 === CALLING generatePDFHTML ===');
        console.log('Base URL:', baseUrl);
        console.log('Survey title:', titleValidation.sanitized || surveyTitle);
        console.log('Email config present:', !!emailConfig);
        console.log('Banner image from survey data:', bannerImage ? 'present' : 'not found');
        console.log('================================');
        
        const htmlContent = await generatePDFHTML(titleValidation.sanitized || surveyTitle, results, emailConfig, baseUrl);
        
        // Launch Puppeteer to generate PDF
        const browser = await puppeteer.launch({
            ...config.pdf.puppeteerOptions,
            timeout: config.pdf.timeout
        });
        
        let pdfBuffer;
        try {
            const page = await browser.newPage();
            page.setDefaultTimeout(config.pdf.timeout);
            
            await page.setContent(htmlContent, { 
                waitUntil: 'networkidle0',
                timeout: config.pdf.timeout
            });
            
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            await browser.close();
            console.log('✅ PDF generated successfully, size:', Math.round(pdfBuffer.length / 1024), 'KB');
            
        } catch (error) {
            await browser.close();
            throw error;
        }
        
        // Create email HTML for PDF attachment
        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Survey Results</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        line-height: 1.6; 
                        color: #333; 
                        max-width: 600px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        background-color: #f8f9fa;
                    }
                    .container {
                        background: white;
                        border-radius: 10px;
                        padding: 30px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .header { 
                        text-align: center; 
                        background: #add8e6; 
                        padding: 30px 20px; 
                        border-radius: 10px; 
                        margin-bottom: 30px; 
                        color: #2c3e50;
                    }
                    .header h1 {
                        margin: 0 0 10px 0;
                        font-size: 2em;
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 1.2em;
                        font-weight: normal;
                    }
                    .content { 
                        background: #f8f9fa; 
                        padding: 25px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                    }
                    .attachment-info { 
                        background: #e8f4f8; 
                        padding: 20px; 
                        border-radius: 8px; 
                        border-left: 4px solid #3498db; 
                        margin: 20px 0; 
                    }
                    .attachment-info h4 {
                        color: #2c3e50;
                        margin-top: 0;
                    }
                    .score-highlight {
                        background: #e8f5e8;
                        padding: 15px;
                        border-radius: 8px;
                        border-left: 4px solid #28a745;
                        margin: 15px 0;
                        text-align: center;
                    }
                    .score-highlight .score {
                        font-size: 2em;
                        font-weight: bold;
                        color: #28a745;
                        margin: 0;
                    }
                    .footer { 
                        text-align: center; 
                        color: #666; 
                        font-size: 0.9em; 
                        margin-top: 30px; 
                        padding-top: 20px;
                        border-top: 1px solid #e9ecef;
                    }
                    ul {
                        padding-left: 20px;
                    }
                    li {
                        margin-bottom: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${titleValidation.sanitized || surveyTitle}</h1>
                        <h2>Your Survey Results</h2>
                    </div>
                    
                    <div class="content">
                        <h3>Thank you for completing the survey!</h3>
                        <p>Your results have been generated and are attached to this email as a professional PDF document.</p>
                        
                        <div class="score-highlight">
                            <div class="score">${results.percentage}%</div>
                            <p style="margin: 5px 0 0 0; color: #666;">Your Overall Score</p>
                        </div>
                        
                        <div class="attachment-info">
                            <h4>📎 Attachment Details:</h4>
                            <ul>
                                <li><strong>File:</strong> ${(titleValidation.sanitized || surveyTitle).replace(/[^a-zA-Z0-9]/g, '_')}_Results.pdf</li>
                                <li><strong>Content:</strong> Complete survey results with detailed breakdown</li>
                                <li><strong>Format:</strong> PDF (Adobe Acrobat) - Perfect for printing or sharing</li>
                                <li><strong>Size:</strong> ${Math.round(pdfBuffer.length / 1024)} KB</li>
                            </ul>
                        </div>
                        
                        <p><strong>The PDF contains:</strong></p>
                        <ul>
                            <li>Your overall score and percentage</li>
                            <li>Detailed breakdown by category</li>
                            <li>Professional formatting for easy reading</li>
                            <li>Perfect for sharing with colleagues or saving for your records</li>
                        </ul>
                        
                        <p style="margin-top: 20px;"><em>Simply open the attached PDF file to view your complete results in a beautifully formatted document.</em></p>
                    </div>
                    
                    <div class="footer">
                        <p>If you have any questions about your results, please don't hesitate to contact us.</p>
                        <p><strong>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const transporter = nodemailer.createTransport({
            ...emailConfig,
            connectionTimeout: config.email.timeout,
            greetingTimeout: config.email.timeout,
            socketTimeout: config.email.timeout
        });
        
        const mailOptions = {
            from: emailConfig.auth.user,
            to: recipientEmail,
            subject: `Your ${titleValidation.sanitized || surveyTitle} Results (PDF Report)`,
            html: emailHTML,
            attachments: [{
                filename: `${(titleValidation.sanitized || surveyTitle).replace(/[^a-zA-Z0-9]/g, '_')}_Results.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        // Store email recipient data for analysis
        storeEmailRecipientData(recipientEmail, titleValidation.sanitized || surveyTitle, results, req);
        
        // Also store survey results in main directory for analytics dashboard
        storeSurveyResults(titleValidation.sanitized || surveyTitle, results, req);
        
        console.log('✅ Email with PDF attachment sent successfully to:', recipientEmail);
        return successResponse(res, { 
            sentAsPDF: true,
            pdfSize: Math.round(pdfBuffer.length / 1024) + ' KB'
        }, `PDF results sent successfully to ${recipientEmail}`);
        
    } catch (error) {
        logger.error('Failed to generate PDF or send email:', error);
        return internalServerErrorResponse(res, `Failed to send PDF email: ${error.message}`);
    }
}));

/**
 * @route POST /api/send-results
 * @group Survey - Survey Actions
 * @param {string} recipientEmail.body.required - The recipient's email address
 * @param {string} surveyTitle.body.required - The title of the survey
 * @param {object} results.body.required - The survey results object
 * @param {string} chartData.body - The chart data as a base64 string
 * @param {boolean} includePDF.body - Whether to include a PDF of the results
 * @returns {object} 200 - Email sent successfully
 * @returns {Error} 400 - Bad Request or validation error
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/send-results', emailLimiter, asyncHandler(async (req, res) => {
    logger.info('Received request to send survey results');
    const { recipientEmail, surveyTitle, results, chartData, includePDF } = req.body;
    const emailConfig = getEmailConfig();
    logger.info('Email config at send-results', { host: emailConfig.host, user: emailConfig.auth.user });
    
    // Validate email configuration
    if (!emailConfig.host || !emailConfig.auth.user) {
        logger.error('Email not configured, aborting send.');
        return badRequestResponse(res, 'Email not configured');
    }
    
    // Validate required fields
    if (!recipientEmail || !results || !surveyTitle) {
        return badRequestResponse(res, 'Missing required data: recipientEmail, surveyTitle, and results are required');
    }
    
    // Validate email format
    const emailValidation = validateEmail(recipientEmail);
    if (!emailValidation.valid) {
        return validationErrorResponse(res, [emailValidation.message]);
    }
    
    // Validate survey title
    const titleValidation = validateSurveyTitle(surveyTitle);
    if (!titleValidation.valid) {
        return validationErrorResponse(res, [titleValidation.message]);
    }
    
    // Validate survey results
    const resultsValidation = validateSurveyResults(results);
    if (!resultsValidation.valid) {
        return validationErrorResponse(res, [resultsValidation.message]);
    }
    
    // Additional security validation
    if (!validateSurveyResultsStructure(results)) {
        return badRequestResponse(res, 'Invalid survey results structure');
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(recipientEmail);
    const sanitizedTitle = sanitizeInput(surveyTitle);
    
    // Load survey data to get banner image
    let bannerImage = null;
    const surveyDataPath = path.join(__dirname, '..', 'survey-data.json');
    if (fs.existsSync(surveyDataPath)) {
        try {
            const surveyDataRaw = fs.readFileSync(surveyDataPath, 'utf8');
            const surveyData = JSON.parse(surveyDataRaw);
            bannerImage = surveyData.banner || null;
        } catch (error) {
            logger.warn('Failed to load survey data for banner image:', error);
        }
    }
    
    const transporter = nodemailer.createTransport({
        ...emailConfig,
        connectionTimeout: config.email.timeout,
        greetingTimeout: config.email.timeout,
        socketTimeout: config.email.timeout
    });
        
    // Generate HTML email content
    const emailHTML = generateResultsHTML(titleValidation.sanitized || surveyTitle, results, chartData);
    
    const mailOptions = {
        from: emailConfig.auth.user,
        to: recipientEmail,
        subject: `Your ${titleValidation.sanitized || surveyTitle} Results`,
        html: emailHTML
    };
    
    // Generate and attach PDF if requested
    if (includePDF) {
        try {
            // Generate unique ID for the PDF
            const pdfId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Create PDFs directory if it doesn't exist
            const pdfsDir = config.pdf.outputDir;
            if (!fs.existsSync(pdfsDir)) {
                fs.mkdirSync(pdfsDir, { recursive: true });
            }
            
            const pdfPath = path.join(pdfsDir, `${pdfId}.pdf`);
            
            // Generate HTML content for PDF
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const htmlContent = await generatePDFHTML(titleValidation.sanitized || surveyTitle, results, emailConfig, baseUrl);
            
            // Launch Puppeteer with enhanced configuration
            const browser = await puppeteer.launch({
                ...config.pdf.puppeteerOptions,
                timeout: config.pdf.timeout
            });
            
            const page = await browser.newPage();
            
            // Set page timeout
            page.setDefaultTimeout(config.pdf.timeout);
            
            await page.setContent(htmlContent, { 
                waitUntil: 'networkidle0',
                timeout: config.pdf.timeout
            });
            
            const pdfBuffer = await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            // Ensure PDF is written before closing browser
            await new Promise(resolve => setTimeout(resolve, 100));
            await browser.close();
                
            // Add PDF attachment to email
            mailOptions.attachments = [{
                filename: `${(titleValidation.sanitized || surveyTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.pdf`,
                path: pdfPath
            }];
            
            // Send email with attachment
            await transporter.sendMail(mailOptions);
            
            // Clean up the PDF file after sending
            setTimeout(() => {
                if (fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                }
            }, config.pdf.cleanupDelay);
            
        } catch (pdfError) {
            console.error('PDF generation error for email:', pdfError);
            // Send email without PDF if PDF generation fails
            await transporter.sendMail(mailOptions);
            
            // Store email recipient data for analysis
            storeEmailRecipientData(recipientEmail, titleValidation.sanitized || surveyTitle, results, req);
            
            // Also store survey results in main directory for analytics dashboard
            storeSurveyResults(titleValidation.sanitized || surveyTitle, results, req);
            
            return successResponse(res, null, 
                `Results sent successfully to ${recipientEmail} (PDF attachment failed: ${pdfError.message})`
            );
        }
    } else {
        // Send email without PDF
        await transporter.sendMail(mailOptions);
    }
    
    // Store email recipient data for analysis
    storeEmailRecipientData(recipientEmail, titleValidation.sanitized || surveyTitle, results, req);
    
    // Also store survey results in main directory for analytics dashboard
    storeSurveyResults(titleValidation.sanitized || surveyTitle, results, req);
    
    const message = includePDF ? 
        `Results with PDF attachment sent successfully to ${recipientEmail}` :
        `Results sent successfully to ${recipientEmail}`;
        
    return successResponse(res, null, message);
}));

/**
 * @route POST /api/email-results
 * @group Survey - Survey Actions
 * @param {object} results.body.required - The survey results object
 * @param {string} surveyTitle.body.required - The title of the survey
 * @param {string} customTemplate.body - Custom HTML template for the email
 * @param {boolean} useCustomTemplate.body - Whether to use the custom template
 * @returns {object} 200 - Email sent successfully
 * @returns {Error} 400 - Bad Request or validation error
 * @returns {Error} 500 - Internal Server Error
 */
router.post('/email-results', emailLimiter, asyncHandler(async (req, res) => {
    logger.info('Received request to email survey results with custom template');
    const { results, surveyTitle, customTemplate, useCustomTemplate } = req.body;
    const emailConfig = getEmailConfig();
    
    // Validate email configuration
    if (!emailConfig.host || !emailConfig.auth.user) {
        logger.error('Email not configured, aborting send.');
        return badRequestResponse(res, 'Email not configured');
    }
    
    // Validate required fields
    if (!results || !surveyTitle) {
        return badRequestResponse(res, 'Missing required data: results and surveyTitle are required');
    }
    
    // Validate survey title
    const titleValidation = validateSurveyTitle(surveyTitle);
    if (!titleValidation.valid) {
        return validationErrorResponse(res, [titleValidation.message]);
    }
    
    // Validate survey results
    const resultsValidation = validateSurveyResults(results);
    if (!resultsValidation.valid) {
        return validationErrorResponse(res, [resultsValidation.message]);
    }
    
    // Additional security validation
    if (!validateSurveyResultsStructure(results)) {
        return badRequestResponse(res, 'Invalid survey results structure');
    }
    
    // Get recipient email from user input (this will be handled by the frontend)
    const recipientEmail = req.body.recipientEmail;
    if (!recipientEmail) {
        return badRequestResponse(res, 'Recipient email is required');
    }
    
    // Validate email format
    const emailValidation = validateEmail(recipientEmail);
    if (!emailValidation.valid) {
        return validationErrorResponse(res, [emailValidation.message]);
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(recipientEmail);
    const sanitizedTitle = sanitizeInput(surveyTitle);
    
    const transporter = nodemailer.createTransport({
        ...emailConfig,
        connectionTimeout: config.email.timeout,
        greetingTimeout: config.email.timeout,
        socketTimeout: config.email.timeout
    });
    
    // Generate email content - use custom template if provided, otherwise use default
    let emailHTML;
    if (useCustomTemplate && customTemplate) {
        emailHTML = customTemplate;
        console.log('Using custom template, length:', customTemplate.length);
        console.log('Custom template contains images:', customTemplate.includes('data:image/'));
    } else {
        emailHTML = generateResultsHTML(titleValidation.sanitized || surveyTitle, results);
        console.log('Using default template, length:', emailHTML.length);
    }
    
    // Prepare email attachments for images (CID approach for better compatibility)
    const attachments = [];
    let processedEmailHTML = emailHTML;
    
    // Check if email template has images and convert them to CID attachments
    if (emailHTML.includes('data:image/')) {
        console.log('Found images in email template, converting to CID attachments...');
        // Extract base64 images and replace with CID references
        const imageRegex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/g;
        let match;
        let imageCounter = 1;
        
        while ((match = imageRegex.exec(emailHTML)) !== null) {
            const base64Data = match[1];
            const cid = `image${imageCounter}`;
            
            // Extract image type and data
            const [header, data] = base64Data.split(',');
            const mimeType = header.match(/data:([^;]+)/)[1];
            
            console.log(`Processing image ${imageCounter}: ${mimeType}, size: ${data.length} chars`);
            
            // Add to attachments
            attachments.push({
                filename: `image${imageCounter}.${mimeType.split('/')[1]}`,
                content: data,
                encoding: 'base64',
                cid: cid
            });
            
            // Replace base64 src with CID reference
            processedEmailHTML = processedEmailHTML.replace(
                match[1], 
                `cid:${cid}`
            );
            
            imageCounter++;
        }
        console.log(`Converted ${imageCounter - 1} images to CID attachments`);
        console.log('Processed email HTML length:', processedEmailHTML.length);
    } else {
        console.log('No images found in email template');
    }
    
    const mailOptions = {
        from: emailConfig.auth.user,
        to: recipientEmail,
        subject: `Your ${titleValidation.sanitized || surveyTitle} Results`,
        html: processedEmailHTML,
        attachments: attachments
    };
    
    // Check email size and provide fallback for large emails
    const emailSize = Buffer.byteLength(processedEmailHTML, 'utf8') + 
                     attachments.reduce((total, att) => total + Buffer.byteLength(att.content, 'base64'), 0);
    
    console.log(`Total email size: ${(emailSize / 1024 / 1024).toFixed(2)} MB`);
    
    // If email is too large (>10MB), fall back to simpler template
    if (emailSize > 10 * 1024 * 1024) {
        console.log('Email too large, falling back to simple template without images');
        
        // Generate simple HTML without images
        const simpleHTML = generateResultsHTML(titleValidation.sanitized || surveyTitle, results);
        
        mailOptions.html = simpleHTML;
        mailOptions.attachments = [];
        
        // Add note about images
        mailOptions.html = simpleHTML.replace(
            '<body',
            '<body'
        ).replace(
            '</body>',
            '<div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 20px; color: #856404;"><strong>Note:</strong> This email was simplified to ensure delivery. Images and custom formatting have been removed.</div></body>'
        );
    }
    
    try {
        // Send email
        await transporter.sendMail(mailOptions);
        
        // Store email recipient data for analysis
        storeEmailRecipientData(recipientEmail, titleValidation.sanitized || surveyTitle, results, req);
        
        // Also store survey results in main directory for analytics dashboard
        storeSurveyResults(titleValidation.sanitized || surveyTitle, results, req);
        
        return successResponse(res, null, `Results sent successfully to ${recipientEmail}`);
        
    } catch (emailError) {
        logger.error('Failed to send email:', emailError);
        return internalServerErrorResponse(res, `Failed to send email: ${emailError.message}`);
    }
}));

// Generate shareable link for results
router.post('/generate-link', asyncHandler(async (req, res) => {
    const { results, surveyTitle } = req.body;
    
    // Validate required fields
    if (!results || !surveyTitle) {
        return badRequestResponse(res, 'Missing required data: results and surveyTitle are required');
    }
    
    // Validate survey title
    const titleValidation = validateSurveyTitle(surveyTitle);
    if (!titleValidation.valid) {
        return validationErrorResponse(res, [titleValidation.message]);
    }
    
    // Validate survey results
    const resultsValidation = validateSurveyResults(results);
    if (!resultsValidation.valid) {
        return validationErrorResponse(res, [resultsValidation.message]);
    }
    
    // Generate unique ID for the results
    const resultId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store results (in production, use a database)
    const resultsData = {
        id: resultId,
        surveyTitle: titleValidation.sanitized || surveyTitle,
        results,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };
    
    // Save to file (in production, use database)
    const resultsDir = config.storage.sharedResultsDir;
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filePath = path.join(resultsDir, `${resultId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(resultsData, null, 2));
    
    const shareableLink = `${req.protocol}://${req.get('host')}/shared/${resultId}`;
    
    return successResponse(res, { 
        link: shareableLink, 
        id: resultId,
        expiresAt: new Date(Date.now() + config.storage.maxFileAge).toISOString()
    }, 'Shareable link generated successfully');
}));

// Generate PDF from survey results
router.post('/generate-pdf', pdfLimiter, asyncHandler(async (req, res) => {
    console.log('📄 === GENERATE PDF ROUTE CALLED ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Survey title:', req.body.surveyTitle);
    console.log('Results structure:', req.body.results ? 'present' : 'missing');
    console.log('===================================');
    
    const { results, surveyTitle } = req.body;
    
    // Validate required fields
    if (!results || !surveyTitle) {
        return badRequestResponse(res, 'Missing required data: results and surveyTitle are required');
    }
    
    // Validate survey title
    const titleValidation = validateSurveyTitle(surveyTitle);
    if (!titleValidation.valid) {
        return validationErrorResponse(res, [titleValidation.message]);
    }
    
    // Validate survey results
    const resultsValidation = validateSurveyResults(results);
    if (!resultsValidation.valid) {
        return validationErrorResponse(res, [resultsValidation.message]);
    }
    
    // Load survey data to get banner image
    let bannerImage = null;
    const surveyDataPath = path.join(__dirname, '..', 'survey-data.json');
    if (fs.existsSync(surveyDataPath)) {
        try {
            const surveyDataRaw = fs.readFileSync(surveyDataPath, 'utf8');
            const surveyData = JSON.parse(surveyDataRaw);
            bannerImage = surveyData.banner || null;
        } catch (error) {
            logger.warn('Failed to load survey data for banner image:', error);
        }
    }
    
    // Get email configuration for template images
    const emailConfig = getEmailConfig();
    
    // Generate unique ID for the PDF
    const pdfId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Create PDFs directory if it doesn't exist
    const pdfsDir = config.pdf.outputDir;
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
    }
    
    const pdfPath = path.join(pdfsDir, `${pdfId}.pdf`);
    
    // Generate HTML content for PDF
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    console.log('🎨 === CALLING generatePDFHTML (generate-pdf route) ===');
    console.log('Base URL:', baseUrl);
    console.log('Survey title:', titleValidation.sanitized || surveyTitle);
    console.log('Email config present:', !!emailConfig);
    console.log('Banner image from survey data:', bannerImage ? 'present' : 'not found');
    console.log('================================================');
    
    const htmlContent = await generatePDFHTML(titleValidation.sanitized || surveyTitle, results, emailConfig, baseUrl);
    
    // Launch Puppeteer with enhanced configuration
    const browser = await puppeteer.launch({
        ...config.pdf.puppeteerOptions,
        timeout: config.pdf.timeout
    });
    
    try {
        const page = await browser.newPage();
        
        // Set page timeout
        page.setDefaultTimeout(config.pdf.timeout);
        
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: config.pdf.timeout
        });
        
        const pdfBuffer = await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        // Ensure PDF is written before closing browser
        await new Promise(resolve => setTimeout(resolve, 100));
        await browser.close();
        
        // Generate download URL
        const downloadUrl = `${req.protocol}://${req.get('host')}/download-pdf/${pdfId}`;
        
        // Schedule cleanup
        setTimeout(() => {
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }
        }, config.pdf.cleanupDelay);
        
        return successResponse(res, { 
            downloadUrl,
            id: pdfId,
            expiresAt: new Date(Date.now() + config.pdf.cleanupDelay).toISOString()
        }, 'PDF generated successfully');
        
    } catch (error) {
        await browser.close();
        throw error;
    }
}));

// Helper function to store email recipient data for analysis
function storeEmailRecipientData(recipientEmail, surveyTitle, results, req) {
    try {
        // Generate unique ID for the email record
        const emailRecordId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Create email records directory if it doesn't exist
        const emailRecordsDir = path.join(config.storage.sharedResultsDir, 'email-recipients');
        if (!fs.existsSync(emailRecordsDir)) {
            fs.mkdirSync(emailRecordsDir, { recursive: true });
        }
        
        // Store email recipient data with survey results
        const emailRecordData = {
            id: emailRecordId,
            recipientEmail: recipientEmail,
            surveyTitle: surveyTitle,
            results: results,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: 'email'
        };
        
        // Save to file
        const filePath = path.join(emailRecordsDir, `${emailRecordId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(emailRecordData, null, 2));
        
        // Clear analytics cache since new email data was added
        clearAnalyticsCache();
        
        console.log(`📧 Email recipient data stored: ${recipientEmail} - ${emailRecordId}`);
        console.log(`🗑️ Analytics cache cleared due to new email data`);
    } catch (error) {
        console.error('❌ Error storing email recipient data:', error.message);
        // Don't throw error to avoid breaking email sending
    }
}

// Helper function to store survey results in main directory for analytics
function storeSurveyResults(surveyTitle, results, req) {
    try {
        // Generate unique ID for the survey result
        const resultId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Create shared results directory if it doesn't exist
        const resultsDir = config.storage.sharedResultsDir;
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Store survey results data
        const resultsData = {
            id: resultId,
            surveyTitle: surveyTitle,
            results: results,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: 'email'
        };
        
        // Save to file in main directory (not email-recipients subdirectory)
        const filePath = path.join(resultsDir, `${resultId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(resultsData, null, 2));
        
        // Clear analytics cache since new data was added
        clearAnalyticsCache();
        
        console.log(`📊 Survey results stored for analytics: ${surveyTitle} - ${resultId}`);
        console.log(`🗑️ Analytics cache cleared due to new survey data`);
    } catch (error) {
        console.error('❌ Error storing survey results:', error.message);
        // Don't throw error to avoid breaking email sending
    }
}

// Helper function to generate email HTML
function generateResultsHTML(surveyTitle, results, chartData) {
    const categoryScoresHTML = Object.entries(results.categoryScores)
        .map(([category, data]) => `
            <div style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${category}</h4>
                <div style="font-size: 1.2em; font-weight: bold; color: #3498db;">${data.percentage}%</div>
                <div style="color: #666;">${data.score} / ${data.maxScore}</div>
            </div>
        `).join('');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${surveyTitle} Results</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; background: #add8e6; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                .score-display { text-align: center; background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                .total-score { font-size: 2em; font-weight: bold; margin-bottom: 10px; }
                .category-scores { margin-bottom: 20px; }
                .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${surveyTitle}</h1>
                <h2>Your Results</h2>
            </div>
            
            <div class="score-display">
                <div class="total-score" style="color: #3498db;">${results.percentage}%</div>
                <p>Total Score: ${results.totalScore} out of ${results.maxPossibleScore}</p>
            </div>
            
            <div class="category-scores">
                <h3>Category Breakdown:</h3>
                ${categoryScoresHTML}
            </div>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                <p>Thank you for completing the ${surveyTitle}!</p>
            </div>
        </body>
        </html>
    `;
}

// Helper function to generate shared results HTML
function generateSharedResultsHTML(resultsData) {
    const { surveyTitle, results } = resultsData;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shared ${surveyTitle} Results</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #add8e6; margin: 0; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .score-display { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 25px; }
                .total-score { font-size: 2em; font-weight: bold; margin-bottom: 10px; color: #3498db; }
                .category-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
                .category-score { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .category-score h4 { color: #2c3e50; margin-bottom: 5px; }
                .score-percentage { font-size: 1.2em; font-weight: bold; color: #3498db; }
                .footer { text-align: center; color: #666; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${surveyTitle}</h1>
                    <h2>Shared Results</h2>
                </div>
                
                <div class="score-display">
                    <div class="total-score">${results.percentage}%</div>
                    <p>Total Score: ${results.totalScore} out of ${results.maxPossibleScore}</p>
                </div>
                
                <div class="category-scores">
                    ${Object.entries(results.categoryScores).map(([category, data]) => `
                        <div class="category-score">
                            <h4>${category}</h4>
                            <div class="score-percentage">${data.percentage}%</div>
                            <p>${data.score} / ${data.maxScore}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div class="footer">
                    <p>Results generated on ${new Date(resultsData.timestamp).toLocaleDateString()}</p>
                    <p><a href="/">Take the survey yourself</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Helper function to generate PDF-optimized HTML
async function generatePDFHTML(surveyTitle, results, emailTemplate = null, baseUrl = 'http://localhost:3003') {
    console.log('=== PDF Generation Debug Start ===');
    console.log('emailTemplate received:', JSON.stringify(emailTemplate, null, 2));
    
    // Extract images from email template if provided
    const headerImage = emailTemplate?.emailTemplate?.headerImage || null;
    const footerImage = emailTemplate?.emailTemplate?.footerImage || null;
    const bannerImage = emailTemplate?.email?.banner || null;
    
    console.log('PDF Generation - Images extracted:', {
        headerImage,
        footerImage, 
        bannerImage,
        emailTemplate: emailTemplate ? 'provided' : 'null'
    });

    // Helper function to convert image to base64 or return existing base64
    const imageToBase64 = (imageInput) => {
        try {
            console.log('Processing image input:', typeof imageInput, imageInput ? imageInput.substring(0, 100) + '...' : 'null');
            
            if (!imageInput) {
                console.log('No image input provided');
                return null;
            }
            
            // Check if it's already a base64 data URL
            if (imageInput.startsWith('data:image/')) {
                console.log('Image is already a base64 data URL, using directly');
                return imageInput;
            }
            
            // Otherwise, treat it as a file path
            console.log('Treating as file path:', imageInput);
            
            // Remove leading slash if present
            const cleanPath = imageInput.startsWith('/') ? imageInput.substring(1) : imageInput;
            const fullPath = path.join(__dirname, '..', 'public', cleanPath);
            
            console.log('Full image path:', fullPath);
            console.log('Path exists:', fs.existsSync(fullPath));
            
            if (!fs.existsSync(fullPath)) {
                console.warn('Image file not found:', fullPath);
                return null;
            }
            
            const stats = fs.statSync(fullPath);
            console.log('File size:', stats.size, 'bytes');
            
            const imageBuffer = fs.readFileSync(fullPath);
            const ext = path.extname(fullPath).toLowerCase();
            let mimeType = 'image/jpeg'; // default
            
            switch (ext) {
                case '.png': mimeType = 'image/png'; break;
                case '.jpg':
                case '.jpeg': mimeType = 'image/jpeg'; break;
                case '.gif': mimeType = 'image/gif'; break;
                case '.webp': mimeType = 'image/webp'; break;
                default: mimeType = 'image/jpeg';
            }
            
            console.log('Image MIME type:', mimeType);
            
            const base64 = imageBuffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            console.log('Base64 conversion successful, length:', base64.length);
            console.log('Data URL preview:', dataUrl.substring(0, 100) + '...');
            
            return dataUrl;
        } catch (error) {
            console.error('Error processing image:', error);
            return null;
        }
    };

    // Convert images to base64
    console.log('Converting header image...');
    const headerImageBase64 = imageToBase64(headerImage);
    
    console.log('Converting footer image...');
    const footerImageBase64 = imageToBase64(footerImage);
    
    console.log('Converting banner image...');
    const bannerImageBase64 = imageToBase64(bannerImage);
    
    console.log('Base64 conversion results:', {
        headerImage: headerImageBase64 ? `converted (${headerImageBase64.length} chars)` : 'failed/null',
        footerImage: footerImageBase64 ? `converted (${footerImageBase64.length} chars)` : 'failed/null',
        bannerImage: bannerImageBase64 ? `converted (${bannerImageBase64.length} chars)` : 'failed/null'
    });
    
    const categoryScoresHTML = Object.entries(results.categoryScores)
        .map(([category, data]) => `
            <div class="category-score">
                <h4>${category}</h4>
                <div class="score-percentage">${data.percentage}%</div>
                <p>${data.score} / ${data.maxScore}</p>
            </div>
        `).join('');
    
    // Header image HTML if provided
    const headerHTML = headerImageBase64 ? `
        <div class="header-image-container">
            <img src="${headerImageBase64}" alt="Header Image" class="header-image">
        </div>
    ` : '';
    
    // Banner image HTML if provided
    const bannerHTML = bannerImageBase64 ? `
        <div class="banner-container">
            <img src="${bannerImageBase64}" alt="Survey Banner" class="banner-image">
        </div>
    ` : '';
    
    // Footer image HTML if provided
    const footerImageHTML = footerImageBase64 ? `
        <div class="footer-image-container">
            <img src="${footerImageBase64}" alt="Footer Image" class="footer-image">
        </div>
    ` : '';

    console.log('HTML generation results:', {
        headerHTML: headerHTML ? 'generated' : 'empty',
        bannerHTML: bannerHTML ? 'generated' : 'empty',
        footerImageHTML: footerImageHTML ? 'generated' : 'empty'
    });
    
    console.log('=== PDF Generation Debug End ===');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${surveyTitle} Results - PDF</title>
            <style>
                @page {
                    margin: 20mm;
                    size: A4;
                }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background: white;
                }
                .header-image-container {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 10px;
                }
                .header-image {
                    max-width: 100%;
                    max-height: 120px;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .banner-container {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 10px;
                }
                .banner-image {
                    max-width: 100%;
                    max-height: 150px;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .footer-image-container {
                    text-align: center;
                    margin-top: 30px;
                    margin-bottom: 20px;
                    padding: 10px;
                }
                .footer-image {
                    max-width: 100%;
                    max-height: 120px;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    background: #add8e6;
                    padding: 30px 20px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                    color: #2c3e50;
                }
                .header h1 {
                    margin: 0 0 10px 0;
                    font-size: 2.2em;
                    font-weight: bold;
                }
                .header h2 {
                    margin: 0;
                    font-size: 1.4em;
                    font-weight: normal;
                }
                .score-display {
                    text-align: center;
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                    border: 2px solid #e9ecef;
                }
                .total-score {
                    font-size: 3em;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #3498db;
                }
                .score-subtitle {
                    font-size: 1.2em;
                    color: #666;
                    margin: 0;
                }
                .category-scores {
                    margin-bottom: 30px;
                }
                .category-scores h3 {
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .category-score {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 6px solid #3498db;
                    margin-bottom: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .category-score h4 {
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                    font-size: 1.3em;
                }
                .score-percentage {
                    font-size: 1.5em;
                    font-weight: bold;
                    color: #3498db;
                    margin-bottom: 5px;
                }
                .category-score p {
                    color: #666;
                    margin: 0;
                    font-size: 1.1em;
                }
                .footer {
                    text-align: center;
                    color: #666;
                    font-size: 0.9em;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                }
                .generation-info {
                    background: #e8f4f8;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-size: 0.9em;
                    color: #2c3e50;
                }
            </style>
        </head>
        <body>
            ${headerHTML}
            ${bannerHTML}
            
            <div class="header">
                <h1>${surveyTitle}</h1>
                <h2>Survey Results Report</h2>
            </div>
            
            <div class="score-display">
                <div class="total-score">${results.percentage}%</div>
                <p class="score-subtitle">Total Score: ${results.totalScore} out of ${results.maxPossibleScore}</p>
            </div>
            
            <div class="category-scores">
                <h3>Category Breakdown</h3>
                ${categoryScoresHTML}
            </div>
            
            ${footerImageHTML}
            
            <div class="footer">
                <p><strong>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</strong></p>
                <div class="generation-info">
                    <p>This PDF report contains your complete ${surveyTitle} results.</p>
                    <p>For more information or to retake the survey, visit our website.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = { router, generateSharedResultsHTML };