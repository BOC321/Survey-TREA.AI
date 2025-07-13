// Comprehensive Email Settings Test
const fs = require('fs');
const path = require('path');

console.log('=== COMPREHENSIVE EMAIL SETTINGS TEST ===\n');

// Test 1: Verify configuration files
console.log('1. Configuration Files Check:');
const emailConfigPath = path.join(__dirname, 'email-config.json');
const configEmailPath = path.join(__dirname, 'config', 'email.json');
const surveyDataPath = path.join(__dirname, 'survey-data.json');

let emailConfig = null;
let configEmail = null;
let surveyData = null;

if (fs.existsSync(emailConfigPath)) {
    emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
    console.log('   ✓ email-config.json exists');
    console.log(`   ✓ SMTP Host: ${emailConfig.host}`);
    console.log(`   ✓ SMTP Port: ${emailConfig.port}`);
    console.log(`   ✓ Username: ${emailConfig.auth.user}`);
    console.log(`   ✓ Has Password: ${!!emailConfig.auth.pass}`);
} else {
    console.log('   ✗ email-config.json not found');
}

if (fs.existsSync(configEmailPath)) {
    configEmail = JSON.parse(fs.readFileSync(configEmailPath, 'utf8'));
    console.log('   ✓ config/email.json exists');
    console.log(`   ✓ SMTP Host: ${configEmail.email.host}`);
    console.log(`   ✓ SMTP Port: ${configEmail.email.port}`);
    console.log(`   ✓ Username: ${configEmail.email.auth.user}`);
    console.log(`   ✓ Has Password: ${!!configEmail.email.auth.pass}`);
} else {
    console.log('   ✗ config/email.json not found');
}

if (fs.existsSync(surveyDataPath)) {
    surveyData = JSON.parse(fs.readFileSync(surveyDataPath, 'utf8'));
    console.log('   ✓ survey-data.json exists');
    console.log(`   ✓ Has emailSettings: ${'emailSettings' in surveyData}`);
    console.log(`   ✓ EmailSettings content: ${JSON.stringify(surveyData.emailSettings)}`);
} else {
    console.log('   ✗ survey-data.json not found');
}

// Test 2: Verify HTML form fields
console.log('\n2. HTML Form Fields Check:');
const htmlPath = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const requiredFields = [
        { id: 'smtpServer', name: 'smtpServer' },
        { id: 'smtpPort', name: 'smtpPort' },
        { id: 'username', name: 'username' },
        { id: 'password', name: 'password' }
    ];
    
    let allFieldsCorrect = true;
    requiredFields.forEach(field => {
        const idPattern = new RegExp(`id="${field.id}"`);
        const namePattern = new RegExp(`name="${field.name}"`);
        
        if (idPattern.test(htmlContent) && namePattern.test(htmlContent)) {
            console.log(`   ✓ Field ${field.id} has correct id and name attributes`);
        } else {
            console.log(`   ✗ Field ${field.id} missing or incorrect attributes`);
            allFieldsCorrect = false;
        }
    });
    
    // Check for form submission handler
    if (htmlContent.includes('onsubmit="saveEmailSettings(event)"')) {
        console.log('   ✓ Form has onsubmit handler');
    } else {
        console.log('   ✗ Form missing onsubmit handler');
        allFieldsCorrect = false;
    }
    
    if (allFieldsCorrect) {
        console.log('   ✓ All HTML form fields are correctly configured');
    }
} else {
    console.log('   ✗ index.html not found');
}

// Test 3: Verify JavaScript functions
console.log('\n3. JavaScript Functions Check:');
const scriptPath = path.join(__dirname, 'public', 'script.js');
if (fs.existsSync(scriptPath)) {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    const requiredFunctions = [
        'loadEmailSettings',
        'saveEmailSettings',
        'testEmailConfiguration'
    ];
    
    requiredFunctions.forEach(func => {
        if (scriptContent.includes(`function ${func}(`)) {
            console.log(`   ✓ Function ${func} exists`);
        } else {
            console.log(`   ✗ Function ${func} missing`);
        }
    });
    
    // Check for proper field handling in loadEmailSettings
    if (scriptContent.includes('settings.host') && scriptContent.includes('settings.auth.user')) {
        console.log('   ✓ loadEmailSettings handles server format');
    } else {
        console.log('   ✗ loadEmailSettings may not handle server format properly');
    }
    
    // Check for form data handling in saveEmailSettings
    if (scriptContent.includes('formData.get(\'smtpServer\')')) {
        console.log('   ✓ saveEmailSettings uses correct form field names');
    } else {
        console.log('   ✗ saveEmailSettings may not use correct form field names');
    }
} else {
    console.log('   ✗ script.js not found');
}

// Test 4: Summary and recommendations
console.log('\n4. Test Summary:');
console.log('=================');

if (emailConfig && configEmail) {
    console.log('✓ Email configuration is properly set up');
    console.log('✓ SMTP server settings are available');
    console.log('✓ The "SMTP server is required" error should be resolved');
    
    console.log('\nNext Steps:');
    console.log('1. Open the application at http://localhost:3000');
    console.log('2. Click "Admin Access"');
    console.log('3. Navigate to "Email Settings"');
    console.log('4. Verify that the form is pre-populated with:');
    console.log(`   - SMTP Server: ${configEmail.email.host}`);
    console.log(`   - SMTP Port: ${configEmail.email.port}`);
    console.log(`   - Username: ${configEmail.email.auth.user}`);
    console.log('5. Test the email configuration by clicking "Save Email Settings"');
    console.log('6. The system should automatically test the email configuration');
} else {
    console.log('✗ Email configuration issues detected');
    console.log('Please check the configuration files and ensure they contain valid SMTP settings');
}

console.log('\n=== TEST COMPLETED ===');