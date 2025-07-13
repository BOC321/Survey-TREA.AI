// Debug script to identify and fix host validation error
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Host Validation Error...\n');

// Check all configuration files for host-related properties
const configFiles = [
    'config/email.json',
    'config/index.js',
    '.env',
    'package.json'
];

configFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`📄 Checking ${file}:`);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for host-related properties
            if (content.includes('hostName') || content.includes('hostType')) {
                console.log(`   ⚠️  Found hostName/hostType references in ${file}`);
                
                // Try to parse as JSON if it's a JSON file
                if (file.endsWith('.json')) {
                    const config = JSON.parse(content);
                    console.log(`   📋 Config object:`, JSON.stringify(config, null, 2));
                    
                    // Check for empty host properties
                    if (config.hostName === '' || config.hostName === undefined) {
                        console.log(`   ❌ hostName is empty or undefined`);
                    }
                    if (config.hostType === undefined) {
                        console.log(`   ❌ hostType is undefined`);
                    }
                }
            }
            
            // Check for READ operations with host validation
            if (content.includes('READ') && content.includes('Host')) {
                console.log(`   🔍 Found READ operation with Host validation in ${file}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error reading ${file}:`, error.message);
        }
    } else {
        console.log(`📄 ${file}: Not found`);
    }
});

// Check for any configuration objects that might have host validation
console.log('\n🔧 Checking for potential host validation code patterns...');

// Search for files that might contain host validation
const searchPatterns = [
    'hostName.*hostType',
    'Host validation failed',
    'READ.*Host',
    'Host is not valid'
];

function searchInFile(filePath, pattern) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const regex = new RegExp(pattern, 'gi');
        const matches = content.match(regex);
        if (matches) {
            console.log(`   🎯 Found pattern "${pattern}" in ${filePath}:`, matches);
            return true;
        }
    } catch (error) {
        // Ignore errors for non-text files
    }
    return false;
}

function searchDirectory(dir, patterns) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                searchDirectory(filePath, patterns);
            } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.json'))) {
                patterns.forEach(pattern => {
                    searchInFile(filePath, pattern);
                });
            }
        });
    } catch (error) {
        // Ignore permission errors
    }
}

searchPatterns.forEach(pattern => {
    console.log(`\n🔍 Searching for pattern: "${pattern}"`);
    searchDirectory(__dirname, [pattern]);
});

console.log('\n✅ Debug complete. Check the output above for any host validation issues.');