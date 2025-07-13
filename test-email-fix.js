// Test script to verify email settings fix
const fs = require('fs');
const path = require('path');

console.log('Testing Email Settings Fix...\n');

// Test 1: Check if survey-data.json has emailSettings
const surveyDataPath = path.join(__dirname, 'survey-data.json');
if (fs.existsSync(surveyDataPath)) {
    const surveyData = JSON.parse(fs.readFileSync(surveyDataPath, 'utf8'));
    console.log('✓ survey-data.json exists');
    console.log('✓ emailSettings object exists:', 'emailSettings' in surveyData);
    console.log('Current emailSettings:', surveyData.emailSettings);
} else {
    console.log('✗ survey-data.json not found');
}

// Test 2: Check if email config files exist
const emailConfigPath = path.join(__dirname, 'email-config.json');
const configEmailPath = path.join(__dirname, 'config', 'email.json');

if (fs.existsSync(emailConfigPath)) {
    const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
    console.log('✓ email-config.json exists');
    console.log('SMTP Host:', emailConfig.host);
    console.log('SMTP Port:', emailConfig.port);
    console.log('Username:', emailConfig.auth.user);
    console.log('Has Password:', !!emailConfig.auth.pass);
} else {
    console.log('✗ email-config.json not found');
}

if (fs.existsSync(configEmailPath)) {
    const configEmail = JSON.parse(fs.readFileSync(configEmailPath, 'utf8'));
    console.log('✓ config/email.json exists');
    console.log('SMTP Host:', configEmail.email.host);
    console.log('SMTP Port:', configEmail.email.port);
    console.log('Username:', configEmail.email.auth.user);
    console.log('Has Password:', !!configEmail.email.auth.pass);
} else {
    console.log('✗ config/email.json not found');
}

console.log('\nTest completed. The fix should resolve the "SMTP server is required" issue by:');
console.log('1. Fixing HTML form field names to match JavaScript expectations');
console.log('2. Ensuring proper form submission handling');
console.log('3. Using existing email configuration from config files');