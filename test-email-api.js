const http = require('http');

// Test the email-config API endpoint
const options = {
    hostname: 'localhost',
    port: 3003,
    path: '/api/email-config',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', data);
        
        try {
            const parsed = JSON.parse(data);
            console.log('Parsed JSON (full structure):');
            console.log(JSON.stringify(parsed, null, 2));
            
            // Check the structure that emailResults() is looking for (CORRECTED)
            console.log('\n--- Validation Check ---');
            console.log('parsed.success:', parsed.success);
            console.log('parsed.data:', !!parsed.data);
            console.log('parsed.data.emailConfig:', !!parsed.data?.emailConfig);
            console.log('parsed.data.emailConfig.auth:', !!parsed.data?.emailConfig?.auth);
            console.log('parsed.data.emailConfig.auth.user:', parsed.data?.emailConfig?.auth?.user);
            
            const isValid = parsed.success && parsed.data && parsed.data.emailConfig && parsed.data.emailConfig.auth && parsed.data.emailConfig.auth.user;
            console.log('Would pass emailResults() validation:', isValid);
            
        } catch (error) {
            console.error('Failed to parse JSON:', error);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.end();