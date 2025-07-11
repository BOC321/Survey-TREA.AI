const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Import utilities and configuration
const config = require('../config');
const { asyncHandler } = require('../utils/apiResponse');
const { generateSharedResultsHTML } = require('./survey');

// Serve shared results
router.get('/:id', asyncHandler(async (req, res) => {
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

// Download generated PDF
router.get('/download-pdf/:id', asyncHandler(async (req, res) => {
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

module.exports = router;