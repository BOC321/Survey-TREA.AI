// Comprehensive test for banner image validation debugging
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Banner Image Validation Issue');
console.log('==========================================');

// Test 1: Check current implementation
console.log('\n📋 Step 1: Checking Current Implementation');
console.log('------------------------------------------');

const scriptPath = path.join(__dirname, 'public', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract the validateFileUpload function
const validateFunctionMatch = scriptContent.match(/function validateFileUpload\(input\)\s*{[\s\S]*?^}/m);
if (validateFunctionMatch) {
    console.log('✅ validateFileUpload function found');
    
    // Check if it returns a Promise
    const hasPromise = validateFunctionMatch[0].includes('return new Promise');
    console.log('✅ Returns Promise:', hasPromise ? 'YES' : 'NO');
    
    // Check dimension limits
    const dimensionMatch = validateFunctionMatch[0].match(/maxWidth\s*=\s*(\d+).*maxHeight\s*=\s*(\d+)/s);
    if (dimensionMatch) {
        console.log(`✅ Dimension limits: ${dimensionMatch[1]}x${dimensionMatch[2]} pixels`);
    }
} else {
    console.log('❌ validateFileUpload function not found');
}

// Test 2: Check saveBasicSettings function
console.log('\n📋 Step 2: Checking saveBasicSettings Function');
console.log('----------------------------------------------');

const saveBasicMatch = scriptContent.match(/async function saveBasicSettings\(\)\s*{[\s\S]*?^}/m);
if (saveBasicMatch) {
    console.log('✅ saveBasicSettings is async');
    
    const hasAwait = saveBasicMatch[0].includes('await validateFileUpload');
    console.log('✅ Uses await for validation:', hasAwait ? 'YES' : 'NO');
} else {
    console.log('❌ saveBasicSettings function not found or not async');
}

// Test 3: Check HTML templates
console.log('\n📋 Step 3: Checking HTML Templates');
console.log('----------------------------------');

const ejsPath = path.join(__dirname, 'views', 'index.ejs');
const ejsContent = fs.readFileSync(ejsPath, 'utf8');
const ejsOnchange = ejsContent.match(/onchange="([^"]+)"/);
if (ejsOnchange) {
    console.log(`✅ EJS onchange handler: ${ejsOnchange[1]}`);
}

// Test 4: Create a test HTML file to verify client-side validation
console.log('\n📋 Step 4: Creating Test HTML for Manual Validation');
console.log('---------------------------------------------------');

const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Banner Image Validation Test</title>
    <style>
        .container { max-width: 600px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="file"] { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .validation-error { color: #e74c3c; display: none; margin-top: 5px; }
        .validation-error.show { display: block; }
        .invalid { border-color: #e74c3c; }
        .test-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Banner Image Validation Test</h1>
        
        <div class="test-info">
            <h3>Test Instructions:</h3>
            <ol>
                <li>Select a JPG image file</li>
                <li>Check if validation works immediately</li>
                <li>Try images larger than 2000x1000 pixels</li>
                <li>Try images smaller than 2000x1000 pixels</li>
            </ol>
        </div>

        <div class="form-group">
            <label for="banner-upload">Banner Image (Max: 2000x1000 pixels):</label>
            <input type="file" id="banner-upload" accept="image/*" onchange="handleFileUploadChange(this)">
            <span class="validation-error" id="banner-upload-error"></span>
        </div>

        <div id="test-results"></div>

        <script>
            // Copy the validation functions from the main script
            function validateFileUpload(input) {
                return new Promise((resolve) => {
                    const file = input.files[0];
                    const errorElement = document.getElementById(input.id + '-error');
                    
                    // Clear previous error
                    clearValidationError(input, errorElement);
                    
                    if (!file) {
                        resolve(true);
                        return;
                    }
                    
                    // Check file type
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                        showValidationError(input, errorElement, 'Please select a valid image file (JPEG, PNG, GIF, WebP)');
                        resolve(false);
                        return;
                    }
                    
                    // Check file size (max 5MB)
                    const maxSize = 5 * 1024 * 1024;
                    if (file.size > maxSize) {
                        showValidationError(input, errorElement, 'File size must be less than 5MB');
                        resolve(false);
                        return;
                    }
                    
                    // Check image dimensions
                    const img = new Image();
                    img.onload = function() {
                        const maxWidth = 2000;
                        const maxHeight = 1000;
                        
                        logTestResult(\`Image dimensions: \${this.width}x\${this.height}\`);
                        
                        if (this.width > maxWidth || this.height > maxHeight) {
                            showValidationError(input, errorElement, \`Image dimensions must be less than \${maxWidth}x\${maxHeight} pixels\`);
                            logTestResult(\`❌ VALIDATION FAILED: Image too large (\${this.width}x\${this.height})\`, 'error');
                            resolve(false);
                        } else {
                            logTestResult(\`✅ VALIDATION PASSED: Image size OK (\${this.width}x\${this.height})\`, 'success');
                            resolve(true);
                        }
                        
                        URL.revokeObjectURL(img.src);
                    };
                    
                    img.onerror = function() {
                        showValidationError(input, errorElement, 'Invalid image file');
                        logTestResult('❌ VALIDATION FAILED: Invalid image file', 'error');
                        resolve(false);
                        URL.revokeObjectURL(img.src);
                    };
                    
                    img.src = URL.createObjectURL(file);
                    logTestResult(\`📁 Loading image: \${file.name} (\${file.type}, \${(file.size/1024/1024).toFixed(2)}MB)\`);
                });
            }

            function handleFileUploadChange(input) {
                logTestResult('🔄 File selection changed, starting validation...');
                validateFileUpload(input).then(isValid => {
                    logTestResult(\`🏁 Final validation result: \${isValid ? 'VALID' : 'INVALID'}\`, isValid ? 'success' : 'error');
                });
            }

            function showValidationError(input, errorElement, message) {
                input.classList.add('invalid');
                errorElement.textContent = message;
                errorElement.classList.add('show');
            }

            function clearValidationError(input, errorElement) {
                input.classList.remove('invalid');
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }

            function logTestResult(message, type = 'info') {
                const resultsDiv = document.getElementById('test-results');
                const resultDiv = document.createElement('div');
                resultDiv.className = \`test-result \${type}\`;
                resultDiv.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
                resultsDiv.appendChild(resultDiv);
                resultsDiv.scrollTop = resultsDiv.scrollHeight;
                console.log(message);
            }

            // Initialize
            logTestResult('🚀 Test page loaded and ready');
        </script>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'test-banner-validation.html'), testHtml);
console.log('✅ Created test-banner-validation.html');

// Test 5: Check for any syntax errors in the script
console.log('\n📋 Step 5: Checking for Syntax Errors');
console.log('-------------------------------------');

try {
    // Try to parse the JavaScript (basic syntax check)
    const vm = require('vm');
    const context = {
        console: console,
        document: { getElementById: () => ({}) },
        Image: function() { return {}; },
        URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
        window: {}
    };
    
    // Extract just the validateFileUpload function for testing
    const functionCode = validateFunctionMatch ? validateFunctionMatch[0] : '';
    if (functionCode) {
        vm.createContext(context);
        vm.runInContext(functionCode, context);
        console.log('✅ No syntax errors detected in validateFileUpload');
    }
} catch (error) {
    console.log('❌ Syntax error detected:', error.message);
}

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Open http://localhost:3003/test-banner-validation.html in your browser');
console.log('2. Test with different image sizes to see real-time validation');
console.log('3. Check browser console for detailed logs');
console.log('4. Compare behavior with the main application');

console.log('\n💡 Debugging Tips:');
console.log('==================');
console.log('• Open browser DevTools (F12) to see console logs');
console.log('• Try images both larger and smaller than 2000x1000');
console.log('• Check if error messages appear immediately');
console.log('• Verify that form submission is blocked for invalid images');