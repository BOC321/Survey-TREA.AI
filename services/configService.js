const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const merge = require('lodash/merge');

const configFilePath = path.join(__dirname, '..', 'config', 'email.json');

const defaultConfig = {
    email: {
        host: '',
        port: 587,
        secure: false,
        auth: {
            user: '',
            pass: ''
        },
        title: 'The Answer Trap Risk Profile Survey',
        banner: ''
    },
    emailTemplate: {
        backgroundColor: '#ffffff',
        headerImage: '',
        footerImage: '',
        headerText: 'Survey Results Report',
        includeIntroQuestions: true,
        includeCategoryTitles: true,
        includeCategoryScores: true,
        includeCategoryDescriptions: true,
        includeRangeDescriptions: true,
        includeOverallScore: true,
        customSections: []
    }
};

function getConfig() {
    try {
        if (fs.existsSync(configFilePath)) {
            const rawData = fs.readFileSync(configFilePath);
            const loadedConfig = JSON.parse(rawData);
            // Deep merge loaded config into defaults to ensure all keys are present
            return merge({}, defaultConfig, loadedConfig);
        }
    } catch (error) {
        logger.error('Failed to load configuration from file. Returning default config.', { message: error.message });
    }
    // Return a copy of the default config if file doesn't exist or fails to parse
    return JSON.parse(JSON.stringify(defaultConfig));
}

function updateConfig(newConfig) {
    try {
        const currentConfig = getConfig();
        const updatedConfig = merge({}, currentConfig, newConfig);
        fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2));
        logger.info('Configuration saved to file.');
    } catch (error) {
        logger.error('Failed to save configuration to file.', { message: error.message });
        throw new Error('Failed to save configuration.');
    }
}

// Ensure the config file exists on startup if it doesn't
if (!fs.existsSync(configFilePath)) {
    try {
        fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
        logger.info('Default configuration file created.');
    } catch (error) {
        logger.error('Failed to create default configuration file.', { message: error.message });
    }
}

module.exports = {
    getConfig,
    updateConfig
};