// Simple script to test API endpoints
const https = require('https');

// Define the endpoints to test
const endpoints = [
  'https://api.gringo.ezyy.cloud/api/health',
  'https://api.gringo.ezyy.cloud/api/auth/login',
  'https://admin.gringo.ezyy.cloud/api/auth/login'
];

// Function to test an endpoint
function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`Testing endpoint: ${url}`);
    
    const req = https.request(
      url,
      { method: 'GET' },
      (res) => {
        console.log(`Status code: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            console.log(`Response data: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
          } catch (e) {
            console.log(`Raw response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
          }
          console.log('-------------------');
          resolve();
        });
      }
    );
    
    req.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      console.log('-------------------');
      resolve();
    });
    
    req.end();
  });
}

// Test all endpoints
async function runTests() {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
}

runTests(); 