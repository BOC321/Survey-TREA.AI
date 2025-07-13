// Comprehensive test script to verify all functions are working
console.log('=== COMPREHENSIVE FUNCTION TEST ===');

// Test 1: Check if setRole function exists
console.log('1. Testing setRole function existence:');
if (typeof setRole === 'function') {
    console.log('✅ setRole function is defined');
    
    // Test calling setRole
    try {
        console.log('Testing setRole("admin")...');
        setRole('admin');
        console.log('✅ setRole("admin") executed successfully');
        
        // Switch back to login
        setTimeout(() => {
            console.log('Testing backToLogin()...');
            backToLogin();
            console.log('✅ backToLogin() executed successfully');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error calling setRole:', error);
    }
} else {
    console.error('❌ setRole function is NOT defined');
}

// Test 2: Check validation functions
console.log('2. Testing validation functions:');
const validationFunctions = ['validateFileUpload', 'handleFileUploadChange', 'showValidationError', 'clearValidationError'];
validationFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} is defined`);
    } else {
        console.error(`❌ ${funcName} is NOT defined`);
    }
});

// Test 3: Check VALIDATION_CONFIG
console.log('3. Testing VALIDATION_CONFIG:');
if (typeof VALIDATION_CONFIG !== 'undefined') {
    console.log('✅ VALIDATION_CONFIG is defined');
    console.log('Config details:', VALIDATION_CONFIG);
} else {
    console.error('❌ VALIDATION_CONFIG is NOT defined');
}

// Test 4: Check other essential functions
console.log('4. Testing other essential functions:');
const essentialFunctions = ['showScreen', 'initializeAdminInterface', 'initializeSurvey', 'sanitizeInput'];
essentialFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} is defined`);
    } else {
        console.error(`❌ ${funcName} is NOT defined`);
    }
});

// Test 5: Check global variables
console.log('5. Testing global variables:');
const globalVars = ['currentRole', 'surveyData', 'userResponses', 'currentQuestionIndex'];
globalVars.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
        console.log(`✅ ${varName} is defined:`, window[varName]);
    } else {
        console.error(`❌ ${varName} is NOT defined`);
    }
});

console.log('=== TEST COMPLETE ===');