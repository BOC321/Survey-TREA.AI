const fs = require('fs');
const config = require('../config');

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

// Function to update the in-memory config after saving
function updateEmailConfig(newConfig) {
    emailConfig = newConfig;
}

module.exports = {
    emailConfig,
    loadEmailConfig,
    saveEmailConfig,
    updateEmailConfig
};