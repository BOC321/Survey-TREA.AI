// Banner Display Test Script
const fs = require('fs');
const path = require('path');

console.log('🖼️  BANNER DISPLAY DIAGNOSTIC TEST');
console.log('=====================================\n');

// Test 1: Check config file
console.log('1. Configuration Check:');
const configPath = path.join(__dirname, 'config', 'email.json');
if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('   ✓ Config file exists');
    console.log(`   ✓ Banner path: ${config.email.banner || 'NOT SET'}`);
    console.log(`   ✓ Title: ${config.email.title || 'NOT SET'}`);
    
    // Test 2: Check if banner file exists
    if (config.email.banner) {
        const bannerPath = path.join(__dirname, 'public', config.email.banner);
        if (fs.existsSync(bannerPath)) {
            const stats = fs.statSync(bannerPath);
            console.log('   ✓ Banner file exists');
            console.log(`   ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`   ✓ Full path: ${bannerPath}`);
        } else {
            console.log('   ✗ Banner file does not exist at expected path');
            console.log(`   ✗ Expected path: ${bannerPath}`);
        }
    } else {
        console.log('   ✗ No banner configured in config file');
    }
} else {
    console.log('   ✗ Config file not found');
}

// Test 3: Check survey data
console.log('\n2. Survey Data Check:');
const surveyDataPath = path.join(__dirname, 'survey-data.json');
if (fs.existsSync(surveyDataPath)) {
    const surveyData = JSON.parse(fs.readFileSync(surveyDataPath, 'utf8'));
    console.log('   ✓ Survey data file exists');
    console.log(`   ✓ Banner in survey data: ${surveyData.banner || 'NOT SET'}`);
    console.log(`   ✓ Title in survey data: ${surveyData.title || 'NOT SET'}`);
} else {
    console.log('   ✗ Survey data file not found');
}

// Test 4: Check uploads directory
console.log('\n3. Uploads Directory Check:');
const uploadsPath = path.join(__dirname, 'public', 'uploads');
if (fs.existsSync(uploadsPath)) {
    const files = fs.readdirSync(uploadsPath);
    console.log('   ✓ Uploads directory exists');
    console.log(`   ✓ Number of files: ${files.length}`);
    files.forEach(file => {
        const filePath = path.join(uploadsPath, file);
        const stats = fs.statSync(filePath);
        console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
} else {
    console.log('   ✗ Uploads directory not found');
}

// Test 5: Test API endpoint simulation
console.log('\n4. API Endpoint Simulation:');
try {
    // Simulate what the /api/survey-data endpoint should return
    const surveyData = JSON.parse(fs.readFileSync(surveyDataPath, 'utf8'));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Apply the same logic as the updated endpoint
    if (config.email.banner) {
        surveyData.banner = config.email.banner;
    }
    if (config.email.title) {
        surveyData.title = config.email.title;
    }
    
    console.log('   ✓ Simulated API response:');
    console.log(`   ✓ Final banner: ${surveyData.banner || 'NOT SET'}`);
    console.log(`   ✓ Final title: ${surveyData.title || 'NOT SET'}`);
    
    // Check if the banner URL is accessible
    if (surveyData.banner) {
        const bannerFilePath = path.join(__dirname, 'public', surveyData.banner);
        if (fs.existsSync(bannerFilePath)) {
            console.log('   ✓ Banner file is accessible via URL path');
        } else {
            console.log('   ✗ Banner file is NOT accessible via URL path');
        }
    }
} catch (error) {
    console.log(`   ✗ Error simulating API: ${error.message}`);
}

// Test 6: HTML banner element check
console.log('\n5. HTML Banner Element Check:');
const htmlPath = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    if (htmlContent.includes('id="banner-image"')) {
        console.log('   ✓ Banner image element exists in HTML');
        
        // Check if it's initially hidden
        if (htmlContent.includes('style="display: none;"')) {
            console.log('   ✓ Banner is initially hidden (correct behavior)');
        } else {
            console.log('   ⚠️  Banner is not initially hidden');
        }
    } else {
        console.log('   ✗ Banner image element not found in HTML');
    }
} else {
    console.log('   ✗ HTML file not found');
}

console.log('\n6. Summary and Recommendations:');
console.log('================================');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.email.banner) {
    const bannerPath = path.join(__dirname, 'public', config.email.banner);
    if (fs.existsSync(bannerPath)) {
        console.log('✅ BANNER SHOULD NOW BE WORKING!');
        console.log('');
        console.log('Next steps to verify:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. The banner should automatically load and display');
        console.log('3. If you go to Admin > Basic Settings, you should see the current banner');
        console.log('');
        console.log('The fix included:');
        console.log('- Modified /api/survey-data endpoint to include banner from config');
        console.log('- Banner is now properly loaded from config/email.json');
        console.log('- JavaScript will display the banner when surveyData.banner is set');
    } else {
        console.log('❌ Banner file is missing from uploads directory');
        console.log('Please re-upload your banner image through Admin > Basic Settings');
    }
} else {
    console.log('❌ No banner configured');
    console.log('Please upload a banner image through Admin > Basic Settings');
}

console.log('\n=== TEST COMPLETED ===');