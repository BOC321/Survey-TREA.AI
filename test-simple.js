// Simple test to verify Jest is working
const { execSync } = require('child_process');

console.log('Testing Jest setup...');

try {
  // Run a simple Jest test
  const result = execSync('npx jest --testMatch="**/simple.test.js" --verbose', { 
    encoding: 'utf8',
    cwd: __dirname 
  });
  console.log('Jest test result:', result);
} catch (error) {
  console.error('Jest test failed:', error.message);
}