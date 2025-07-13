const { getConfig, updateConfig: updateSystemConfig } = require('./configService');
const merge = require('lodash/merge');

function getEmailConfig() {
    const config = getConfig();
    return config.email;
}

function updateEmailConfig(newEmailConfig) {
    const currentConfig = getConfig();
    const updatedConfig = merge({}, currentConfig, { email: newEmailConfig });
    updateSystemConfig(updatedConfig);
}

module.exports = {
    getEmailConfig,
    updateEmailConfig
};