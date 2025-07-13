const http = require('http');

function testAPI(port) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: '/api/survey-data',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        port: port,
                        status: res.statusCode,
                        banner: jsonData.banner,
                        title: jsonData.title,
                        hasEmailSettings: !!jsonData.emailSettings
                    });
                } catch (error) {
                    reject({ port: port, error: error.message, rawData: data });
                }
            });
        });

        req.on('error', (error) => {
            reject({ port: port, error: error.message });
        });

        req.end();
    });
}

async function testPort3001() {
    console.log('Testing API response on port 3001...\n');
    
    try {
        const result = await testAPI(3001);
        console.log('Port 3001 Response:');
        console.log('- Status:', result.status);
        console.log('- Banner:', result.banner || 'NOT SET');
        console.log('- Title:', result.title);
        console.log('- Has Email Settings:', result.hasEmailSettings);
        console.log('');
        
        if (result.banner) {
            console.log('✅ SUCCESS: Banner is now working!');
        } else {
            console.log('❌ ISSUE: Banner is still not set');
        }
    } catch (error) {
        console.log('❌ ERROR:', error);
    }
}

testPort3001();