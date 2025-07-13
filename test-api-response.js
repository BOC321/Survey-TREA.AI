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

async function testBothPorts() {
    console.log('Testing API responses on both ports...\n');
    
    try {
        const port3000 = await testAPI(3000);
        console.log('Port 3000 Response:');
        console.log('- Status:', port3000.status);
        console.log('- Banner:', port3000.banner || 'NOT SET');
        console.log('- Title:', port3000.title);
        console.log('- Has Email Settings:', port3000.hasEmailSettings);
        console.log('');
    } catch (error) {
        console.log('Port 3000 Error:', error);
        console.log('');
    }
    
    try {
        const port3001 = await testAPI(3001);
        console.log('Port 3001 Response:');
        console.log('- Status:', port3001.status);
        console.log('- Banner:', port3001.banner || 'NOT SET');
        console.log('- Title:', port3001.title);
        console.log('- Has Email Settings:', port3001.hasEmailSettings);
        console.log('');
    } catch (error) {
        console.log('Port 3001 Error:', error);
        console.log('');
    }
}

testBothPorts();