// Very basic Express server test
const express = require('express');
const app = express();
const PORT = 3002;

console.log('Starting basic test server...');

app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.send('Hello World!');
});

app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Test successful', time: new Date().toISOString() });
});

try {
    app.listen(PORT, () => {
        console.log(`Basic test server running on http://localhost:${PORT}`);
    });
} catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
}

// Error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

console.log('Server setup complete');