const express = require('express');
const path = require('path');
const fs = require('fs');
const { addNonce } = require('../middleware/validation');
const { cacheAnalyticsData, clearAnalyticsCache } = require('../middleware/caching');
const router = express.Router();

// Security validation functions
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
}

function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
        return true; // Optional parameters
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
    }
    
    if (start > end) {
        return false;
    }
    
    // Check for reasonable date range (not more than 10 years)
    const maxRangeMs = 10 * 365 * 24 * 60 * 60 * 1000;
    if (end - start > maxRangeMs) {
        return false;
    }
    
    return true;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    // Remove potential XSS patterns
    return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .trim();
}

// Serve analytics dashboard with nonce injection
router.get('/', addNonce, (req, res) => {
    const htmlPath = path.join(__dirname, '..', 'public', 'analytics.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject nonce into inline styles and scripts
    htmlContent = htmlContent.replace(/<style>/g, `<style nonce="${res.locals.nonce}">`);
    htmlContent = htmlContent.replace(/<script(?!\s+src)/g, `<script nonce="${res.locals.nonce}"`);
    
    res.send(htmlContent);
});

// Analytics API endpoints with input validation and caching
router.get('/responses', cacheAnalyticsData(300), async (req, res) => {
    console.log('=== ANALYTICS RESPONSES ENDPOINT CALLED ===');
    try {
        // Validate query parameters
        const { startDate, endDate, email, surveyVersion } = req.query;
        
        if (startDate && endDate && !validateDateRange(startDate, endDate)) {
            return res.status(400).json({ error: 'Invalid date range provided' });
        }
        
        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format provided' });
        }
        
        const sharedResultsDir = path.join(__dirname, '..', 'shared-results');
        let responses = [];
        
        if (fs.existsSync(sharedResultsDir)) {
            const files = fs.readdirSync(sharedResultsDir);
            
            for (const file of files) {
                if (file.endsWith('.json') && !file.startsWith('email-')) {
                    try {
                        const filePath = path.join(sharedResultsDir, file);
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        responses.push({
                            id: file.replace('.json', ''),
                            timestamp: data.timestamp || new Date().toISOString(),
                            surveyTitle: sanitizeInput(data.surveyTitle) || 'Unknown Survey',
                            results: data.results,
                            ip: data.ip,
                            userAgent: sanitizeInput(data.userAgent)
                        });
                    } catch (error) {
                        console.error(`Error reading response file ${file}:`, error);
                    }
                }
            }
        }
        
        // Apply filters if provided
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            responses = responses.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= start && itemDate <= end;
            });
        }
        
        if (surveyVersion && surveyVersion !== 'all') {
            const sanitizedVersion = sanitizeInput(surveyVersion);
            responses = responses.filter(item => item.surveyTitle === sanitizedVersion);
        }
        
        res.json(responses);
    } catch (error) {
        console.error('Error fetching responses data:', error);
        res.status(500).json({ error: 'Failed to fetch responses data' });
    }
});

router.get('/emails', cacheAnalyticsData(300), async (req, res) => {
    console.log('=== ANALYTICS EMAILS ENDPOINT CALLED ===');
    try {
        // Validate query parameters
        const { startDate, endDate, email } = req.query;
        
        if (startDate && endDate && !validateDateRange(startDate, endDate)) {
            return res.status(400).json({ error: 'Invalid date range provided' });
        }
        
        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format provided' });
        }
        
        const emailRecipientsDir = path.join(__dirname, '..', 'shared-results', 'email-recipients');
        let emails = [];
        
        if (fs.existsSync(emailRecipientsDir)) {
            const files = fs.readdirSync(emailRecipientsDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(emailRecipientsDir, file);
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        emails.push({
                            id: data.id,
                            recipientEmail: sanitizeInput(data.recipientEmail),
                            surveyTitle: sanitizeInput(data.surveyTitle),
                            results: data.results,
                            timestamp: data.timestamp,
                            ip: data.ip,
                            userAgent: sanitizeInput(data.userAgent),
                            method: sanitizeInput(data.method)
                        });
                    } catch (error) {
                        console.error(`Error reading email file ${file}:`, error);
                    }
                }
            }
        }
        
        // Apply filters if provided
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            emails = emails.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= start && itemDate <= end;
            });
        }
        
        if (email) {
            emails = emails.filter(item => item.recipientEmail === email);
        }
        
        res.json(emails);
    } catch (error) {
        console.error('Error fetching email data:', error);
        res.status(500).json({ error: 'Failed to fetch email data' });
    }
});

module.exports = router;