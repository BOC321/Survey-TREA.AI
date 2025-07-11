const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());

// Test analytics endpoints
app.get('/analytics/responses', async (req, res) => {
    try {
        console.log('Analytics responses endpoint called');
        const sharedResultsDir = path.join(__dirname, 'shared-results');
        console.log('Checking directory:', sharedResultsDir);
        
        const responses = [];
        
        if (fs.existsSync(sharedResultsDir)) {
            console.log('Directory exists, reading files...');
            const files = fs.readdirSync(sharedResultsDir);
            console.log('Found files:', files.length);
            
            for (const file of files) {
                if (file.endsWith('.json') && !file.startsWith('email-')) {
                    try {
                        const filePath = path.join(sharedResultsDir, file);
                        console.log('Reading file:', filePath);
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        responses.push({
                            id: file.replace('.json', ''),
                            timestamp: data.timestamp || new Date().toISOString(),
                            surveyTitle: data.surveyTitle || 'Unknown Survey',
                            results: data.results,
                            ip: data.ip,
                            userAgent: data.userAgent
                        });
                    } catch (error) {
                        console.error(`Error reading response file ${file}:`, error);
                    }
                }
            }
        } else {
            console.log('Directory does not exist');
        }
        
        console.log('Returning responses:', responses.length);
        res.json(responses);
    } catch (error) {
        console.error('Error fetching responses data:', error);
        res.status(500).json({ error: 'Failed to fetch responses data' });
    }
});

app.get('/analytics/emails', async (req, res) => {
    try {
        console.log('Analytics emails endpoint called');
        const emailRecipientsDir = path.join(__dirname, 'shared-results', 'email-recipients');
        console.log('Checking email directory:', emailRecipientsDir);
        
        const emails = [];
        
        if (fs.existsSync(emailRecipientsDir)) {
            console.log('Email directory exists, reading files...');
            const files = fs.readdirSync(emailRecipientsDir);
            console.log('Found email files:', files.length);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(emailRecipientsDir, file);
                        console.log('Reading email file:', filePath);
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        emails.push({
                            id: data.id,
                            recipientEmail: data.recipientEmail,
                            surveyTitle: data.surveyTitle,
                            results: data.results,
                            timestamp: data.timestamp,
                            ip: data.ip,
                            userAgent: data.userAgent,
                            method: data.method
                        });
                    } catch (error) {
                        console.error(`Error reading email file ${file}:`, error);
                    }
                }
            }
        } else {
            console.log('Email directory does not exist');
        }
        
        console.log('Returning emails:', emails.length);
        res.json(emails);
    } catch (error) {
        console.error('Error fetching email data:', error);
        res.status(500).json({ error: 'Failed to fetch email data' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Test analytics server running on http://localhost:${PORT}`);
    console.log('Test endpoints:');
    console.log(`- http://localhost:${PORT}/analytics/responses`);
    console.log(`- http://localhost:${PORT}/analytics/emails`);
});