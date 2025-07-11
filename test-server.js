const express = require('express');
const app = express();
const port = 3001;

// Minimal static file serving
app.use(express.static('.'));

// Simple route for testing
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

app.listen(port, () => {
    console.log(`Test server running on http://localhost:${port}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});