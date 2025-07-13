// Startup Host Validation Fix
// This script should be included early in the application startup to prevent host validation errors

const { hostValidator } = require('./utils/hostValidator');

// Apply the fix immediately on startup
console.log('🔧 Applying host validation fix...');

try {
    // Fix any existing host validation issues
    const fixedConfig = hostValidator.fixHostValidationError();
    
    // Set environment variables if they're not already set
    if (!process.env.HOST_NAME) {
        process.env.HOST_NAME = fixedConfig.hostName;
    }
    
    if (!process.env.HOST_TYPE) {
        process.env.HOST_TYPE = fixedConfig.hostType;
    }
    
    console.log('✅ Host validation fix applied successfully');
    console.log('📋 Valid host configuration:', fixedConfig);
    
} catch (error) {
    console.error('❌ Error applying host validation fix:', error.message);
    
    // Fallback configuration
    const fallbackConfig = {
        hostName: 'localhost',
        hostType: 'development',
        port: 3003,
        protocol: 'http'
    };
    
    console.log('🔄 Using fallback host configuration:', fallbackConfig);
}

module.exports = {
    applyHostValidationFix: () => {
        return hostValidator.fixHostValidationError();
    }
};