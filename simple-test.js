const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Simple test endpoint
app.get('/test', (req, res) => {
    console.log('Test endpoint called');
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Test file reading
app.get('/test-files', (req, res) => {
    try {
        console.log('Testing file operations...');
        const sharedResultsDir = path.join(__dirname, 'shared-results');
        console.log('Directory path:', sharedResultsDir);
        
        if (fs.existsSync(sharedResultsDir)) {
            const files = fs.readdirSync(sharedResultsDir);
            console.log('Files found:', files.length);
            
            // Try to read just one file
            const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('email-'));
            if (jsonFiles.length > 0) {
                const firstFile = jsonFiles[0];
                console.log('Reading first file:', firstFile);
                const filePath = path.join(sharedResultsDir, firstFile);
                const data = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(data);
                console.log('File read successfully');
                res.json({ 
                    message: 'File operations working', 
                    filesCount: files.length,
                    jsonFilesCount: jsonFiles.length,
                    sampleFile: firstFile,
                    sampleData: parsed
                });
            } else {
                res.json({ message: 'No JSON files found', filesCount: files.length });
            }
        } else {
            res.json({ message: 'Directory does not exist', path: sharedResultsDir });
        }
    } catch (error) {
        console.error('Error in test-files:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Simple test server running on http://localhost:${PORT}`);
    console.log('Test endpoints:');
    console.log(`- http://localhost:${PORT}/test`);
    console.log(`- http://localhost:${PORT}/test-files`);
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