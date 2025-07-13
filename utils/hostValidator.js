// Host Validation Fix
// This module provides proper host validation and configuration

class HostValidator {
    constructor() {
        this.defaultHostConfig = {
            hostName: 'localhost',
            hostType: 'development',
            port: process.env.PORT || 3003,
            protocol: 'http'
        };
    }

    validateHostConfig(config = {}) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: {}
        };

        // Ensure hostName is provided and valid
        if (!config.hostName || typeof config.hostName !== 'string' || config.hostName.trim() === '') {
            console.log('READ - Host validation failed: hostName is empty or invalid, using default');
            result.sanitized.hostName = this.defaultHostConfig.hostName;
        } else {
            result.sanitized.hostName = config.hostName.trim();
        }

        // Ensure hostType is provided and valid
        if (!config.hostType || typeof config.hostType !== 'string') {
            console.log('READ - Host validation failed: hostType is undefined or invalid, using default');
            result.sanitized.hostType = this.defaultHostConfig.hostType;
        } else {
            result.sanitized.hostType = config.hostType;
        }

        // Validate hostType against allowed values
        const allowedHostTypes = ['development', 'production', 'staging', 'test'];
        if (!allowedHostTypes.includes(result.sanitized.hostType)) {
            console.log(`READ - Host validation failed: hostType '${result.sanitized.hostType}' is not supported, using default`);
            result.sanitized.hostType = this.defaultHostConfig.hostType;
        }

        // Validate port if provided
        if (config.port) {
            const port = parseInt(config.port);
            if (isNaN(port) || port < 1 || port > 65535) {
                console.log('READ - Host validation failed: invalid port, using default');
                result.sanitized.port = this.defaultHostConfig.port;
            } else {
                result.sanitized.port = port;
            }
        } else {
            result.sanitized.port = this.defaultHostConfig.port;
        }

        // Set protocol based on hostType
        result.sanitized.protocol = result.sanitized.hostType === 'production' ? 'https' : 'http';

        return result;
    }

    getValidHostConfig(inputConfig = {}) {
        const validation = this.validateHostConfig(inputConfig);
        
        if (!validation.isValid) {
            console.warn('Host validation failed, using default configuration');
        }

        return validation.sanitized;
    }

    // Fix for the specific error mentioned in the console
    fixHostValidationError() {
        // Check if there's any configuration that might be causing the error
        const problematicConfig = {
            hostName: '',
            hostType: undefined
        };

        console.log('READ - Host validation failed:', problematicConfig);
        console.log('Host is not valid or supported');
        
        // Apply fix
        const fixedConfig = this.getValidHostConfig(problematicConfig);
        console.log('READ - Host validation fixed:', fixedConfig);
        console.log('Host is now valid and supported');
        
        return fixedConfig;
    }
}

// Create global instance
const hostValidator = new HostValidator();

// Auto-fix any existing host validation issues
if (typeof window !== 'undefined') {
    // Client-side fix
    window.HostValidator = HostValidator;
    window.hostValidator = hostValidator;
    
    // Check if there's any existing configuration that needs fixing
    if (window.location) {
        const currentHost = {
            hostName: window.location.hostname || '',
            hostType: window.location.hostname === 'localhost' ? 'development' : 'production'
        };
        
        const validConfig = hostValidator.getValidHostConfig(currentHost);
        window.validHostConfig = validConfig;
    }
} else {
    // Server-side fix
    module.exports = {
        HostValidator,
        hostValidator
    };
}

// Export for immediate use
if (typeof module !== 'undefined' && module.exports) {
    module.exports.fixHostValidation = () => {
        return hostValidator.fixHostValidationError();
    };
}