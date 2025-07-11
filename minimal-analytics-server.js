const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Analytics responses endpoint
app.get('/analytics/responses', (req, res) => {
    console.log('=== Analytics responses endpoint hit ===');
    
    try {
        const resultsDir = path.join(__dirname, 'shared-results');
        console.log('Reading directory:', resultsDir);
        
        if (!fs.existsSync(resultsDir)) {
            console.log('Results directory does not exist');
            return res.json([]);
        }
        
        const files = fs.readdirSync(resultsDir);
        console.log('Found files:', files.length);
        
        const responses = [];
        
        for (const file of files) {
            if (file.endsWith('.json') && !file.startsWith('.')) {
                const filePath = path.join(resultsDir, file);
                console.log('Processing file:', file);
                
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    console.log('File content length:', fileContent.length);
                    
                    const data = JSON.parse(fileContent);
                    console.log('Parsed data keys:', Object.keys(data));
                    
                    responses.push(data);
                } catch (fileError) {
                    console.error('Error processing file', file, ':', fileError.message);
                    // Continue with other files instead of crashing
                }
            }
        }
        
        console.log('Total responses processed:', responses.length);
        res.json(responses);
        
    } catch (error) {
        console.error('Error in analytics endpoint:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Minimal analytics server running on http://localhost:${PORT}`);
    console.log('Test endpoint: http://localhost:3001/test');
    console.log('Analytics endpoint: http://localhost:3001/analytics/responses');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});