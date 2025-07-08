const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Import custom modules
const config = require('./config');
const {
    apiLimiter,
    emailLimiter,
    pdfLimiter,
    validateEmail,
    validateSurveyTitle,
    validateSurveyResults,
    validateEmailConfig,
    securityMiddleware,
    sanitizeInput
} = require('./middleware/validation');
const {
    successResponse,
    createdResponse,
    badRequestResponse,
    notFoundResponse,
    internalServerErrorResponse,
    validationErrorResponse,
    requestTimer,
    globalErrorHandler,
    asyncHandler,
    healthCheckResponse
} = require('./utils/apiResponse');

const app = express();
const PORT = config.app.port;

// Security middleware
app.use(securityMiddleware);

// CORS configuration
app.use(cors({
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging and timing
app.use(requestTimer);

// Rate limiting
app.use('/api/', apiLimiter);

// Body parsing with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Static files
app.use(express.static('.', {
    maxAge: config.env.isProduction ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// Email configuration file path
const EMAIL_CONFIG_FILE = config.email.configFile;

// Default email configuration
const defaultEmailConfig = {
    host: '',
    port: 587,
    secure: false,
    auth: {
        user: '',
        pass: ''
    }
};

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
    const services = {
        email: emailConfig.host ? 'configured' : 'not-configured',
        storage: fs.existsSync(config.storage.sharedResultsDir) ? 'available' : 'unavailable',
        pdf: 'available'
    };
    
    return healthCheckResponse(res, services);
}));

// Load email configuration from file
function loadEmailConfig() {
    try {
        if (fs.existsSync(EMAIL_CONFIG_FILE)) {
            const configData = fs.readFileSync(EMAIL_CONFIG_FILE, 'utf8');
            const config = JSON.parse(configData);
            
            // Validate configuration structure
            if (config && config.auth && typeof config.host === 'string') {
                console.log('✅ Email configuration loaded from file successfully');
                return config;
            } else {
                console.warn('⚠️ Invalid email configuration structure, using defaults');
            }
        } else {
            console.log('📧 No email configuration file found, using defaults');
        }
    } catch (error) {
        console.error('❌ Error loading email configuration:', error.message);
    }
    console.log('📧 Using default email configuration');
    return { ...defaultEmailConfig };
}

// Save email configuration to file
function saveEmailConfig(config) {
    try {
        fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('Email configuration saved to file');
        return true;
    } catch (error) {
        console.error('Error saving email configuration:', error);
        return false;
    }
}

// Load email configuration on startup
let emailConfig = loadEmailConfig();

// Configure email settings
app.post('/api/configure-email', asyncHandler(async (req, res) => {
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
    if (saveEmailConfig(newConfig)) {
        emailConfig = newConfig;
        return successResponse(res, null, 'Email configuration saved successfully and persisted to disk');
    } else {
        return internalServerErrorResponse(res, 'Failed to save email configuration to disk');
    }
}));

// Get current email configuration status
app.get('/api/email-config-status', asyncHandler(async (req, res) => {
    const isConfigured = emailConfig.host && emailConfig.auth.user;
    const configStatus = {
        configured: isConfigured,
        host: emailConfig.host || '',
        port: emailConfig.port || 587,
        username: emailConfig.auth.user || '',
        hasPassword: !!emailConfig.auth.pass,
        configFile: fs.existsSync(EMAIL_CONFIG_FILE)
    };
    
    return successResponse(res, configStatus, 'Email configuration status retrieved successfully');
}));

// Test email configuration
app.post('/api/test-email', emailLimiter, asyncHandler(async (req, res) => {
    if (!emailConfig.host || !emailConfig.auth.user) {
        return badRequestResponse(res, 'Email not configured');
    }
    
    const transporter = nodemailer.createTransport({
        ...emailConfig,
        connectionTimeout: config.email.timeout,
        greetingTimeout: config.email.timeout,
        socketTimeout: config.email.timeout
    });
    
    // Verify connection with timeout
    await transporter.verify();
    
    return successResponse(res, null, 'Email configuration is valid');
}));

// Send survey results via email
app.post('/api/send-results', emailLimiter, asyncHandler(async (req, res) => {
    const { recipientEmail, surveyTitle, results, chartData, includePDF } = req.body;
    
    // Validate email configuration
    if (!emailConfig.host || !emailConfig.auth.user) {
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
            const htmlContent = generatePDFHTML(titleValidation.sanitized || surveyTitle, results);
            
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
    
    const message = includePDF ? 
        `Results with PDF attachment sent successfully to ${recipientEmail}` :
        `Results sent successfully to ${recipientEmail}`;
        
    return successResponse(res, null, message);
}));

// Generate shareable link for results
app.post('/api/generate-link', asyncHandler(async (req, res) => {
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

// Serve shared results
app.get('/shared/:id', asyncHandler(async (req, res) => {
    const resultId = req.params.id;
    
    // Validate result ID format
    if (!/^[a-z0-9]+$/i.test(resultId)) {
        return res.status(400).send('Invalid result ID format');
    }
    
    const resultsDir = config.storage.sharedResultsDir;
    const filePath = path.join(resultsDir, `${resultId}.json`);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Results Not Found</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1 class="error">Results Not Found</h1>
                <p>The requested survey results could not be found or may have expired.</p>
            </body>
            </html>
        `);
    }
    
    const resultsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check if results have expired
    const createdAt = new Date(resultsData.timestamp);
    const expiresAt = new Date(createdAt.getTime() + config.storage.maxFileAge);
    
    if (Date.now() > expiresAt.getTime()) {
        // Clean up expired file
        fs.unlinkSync(filePath);
        return res.status(410).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Results Expired</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1 class="error">Results Expired</h1>
                <p>These survey results have expired and are no longer available.</p>
            </body>
            </html>
        `);
    }
    
    // Generate HTML page for shared results
    const sharedHTML = generateSharedResultsHTML(resultsData);
    
    res.send(sharedHTML);
}));

// Generate PDF from survey results
app.post('/api/generate-pdf', pdfLimiter, asyncHandler(async (req, res) => {
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
    
    // Generate unique ID for the PDF
    const pdfId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Create PDFs directory if it doesn't exist
    const pdfsDir = config.pdf.outputDir;
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
    }
    
    const pdfPath = path.join(pdfsDir, `${pdfId}.pdf`);
    
    // Generate HTML content for PDF
    const htmlContent = generatePDFHTML(titleValidation.sanitized || surveyTitle, results);
    
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

// Download generated PDF
app.get('/download-pdf/:id', asyncHandler(async (req, res) => {
    const pdfId = req.params.id;
    
    // Validate PDF ID format
    if (!/^[a-z0-9]+$/i.test(pdfId)) {
        return res.status(400).json({ success: false, message: 'Invalid PDF ID format' });
    }
    
    const pdfPath = path.join(config.pdf.outputDir, `${pdfId}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({ 
            success: false, 
            message: 'PDF not found or has expired' 
        });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="survey_results_${pdfId}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    
    fileStream.on('error', (error) => {
        console.error('PDF stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to download PDF' });
        }
    });
    
    fileStream.pipe(res);
}));

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    notFoundResponse(res, `API endpoint ${req.originalUrl} not found`);
});

// 404 handler for all other routes
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

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
        
        console.log(`📧 Email recipient data stored: ${recipientEmail} - ${emailRecordId}`);
    } catch (error) {
        console.error('❌ Error storing email recipient data:', error.message);
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
function generatePDFHTML(surveyTitle, results) {
    const categoryScoresHTML = Object.entries(results.categoryScores)
        .map(([category, data]) => `
            <div class="category-score">
                <h4>${category}</h4>
                <div class="score-percentage">${data.percentage}%</div>
                <p>${data.score} / ${data.maxScore}</p>
            </div>
        `).join('');
    
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

// Start server
app.listen(PORT, () => {
    console.log(`Survey server running on http://localhost:${PORT}`);
    console.log('Email functionality is now available!');
});