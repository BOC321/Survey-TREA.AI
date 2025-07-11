#!/usr/bin/env node

// Comprehensive test runner script

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

// Configuration
const config = {
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  },
  testTypes: {
    unit: {
      name: 'Unit Tests',
      command: 'npm run test:unit',
      description: 'Fast isolated tests for individual functions and modules'
    },
    integration: {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      description: 'Tests for API endpoints and service interactions'
    },
    e2e: {
      name: 'E2E Tests',
      command: 'npm run test:e2e',
      description: 'End-to-end tests for complete user workflows'
    },
    visual: {
      name: 'Visual Regression Tests',
      command: 'npm run test:visual',
      description: 'Visual comparison tests for UI consistency'
    }
  }
};

class TestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
  }

  log(message, color = 'reset') {
    console.log(`${config.colors[color]}${message}${config.colors.reset}`);
  }

  logHeader(message) {
    const border = '='.repeat(60);
    this.log(`\n${border}`, 'cyan');
    this.log(`${message}`, 'bright');
    this.log(`${border}`, 'cyan');
  }

  logSection(message) {
    const border = '-'.repeat(40);
    this.log(`\n${border}`, 'blue');
    this.log(`${message}`, 'bright');
    this.log(`${border}`, 'blue');
  }

  async runCommand(command, testType) {
    return new Promise((resolve) => {
      this.log(`\n🚀 Running: ${command}`, 'yellow');
      
      const startTime = Date.now();
      const child = spawn('npm', ['run', `test:${testType}`], {
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        this.results.tests[testType] = {
          success,
          duration,
          exitCode: code,
          stdout,
          stderr
        };

        if (success) {
          this.log(`\n✅ ${config.testTypes[testType].name} completed successfully (${duration}ms)`, 'green');
        } else {
          this.log(`\n❌ ${config.testTypes[testType].name} failed with exit code ${code} (${duration}ms)`, 'red');
        }

        resolve({ success, duration, exitCode: code });
      });
    });
  }

  async checkPrerequisites() {
    this.logSection('Checking Prerequisites');
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      this.log('❌ node_modules not found. Please run: npm install', 'red');
      return false;
    }
    
    // Check if Playwright browsers are installed
    try {
      await execAsync('npx playwright --version');
      this.log('✅ Playwright is available', 'green');
    } catch (error) {
      this.log('⚠️  Playwright not found. Installing...', 'yellow');
      try {
        await execAsync('npm run playwright:install');
        this.log('✅ Playwright browsers installed', 'green');
      } catch (installError) {
        this.log('❌ Failed to install Playwright browsers', 'red');
        return false;
      }
    }
    
    // Check if test directories exist
    const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e', 'tests/visual'];
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        this.log(`⚠️  Test directory ${dir} not found`, 'yellow');
      } else {
        this.log(`✅ Test directory ${dir} exists`, 'green');
      }
    }
    
    return true;
  }

  async runTestSuite(testTypes) {
    this.logHeader('🧪 Survey Application Test Suite');
    
    // Check prerequisites
    const prerequisitesOk = await this.checkPrerequisites();
    if (!prerequisitesOk) {
      this.log('❌ Prerequisites check failed. Aborting test run.', 'red');
      return false;
    }
    
    // Run each test type
    for (const testType of testTypes) {
      if (!config.testTypes[testType]) {
        this.log(`❌ Unknown test type: ${testType}`, 'red');
        continue;
      }
      
      this.logSection(`${config.testTypes[testType].name}`);
      this.log(config.testTypes[testType].description, 'cyan');
      
      const result = await this.runCommand(config.testTypes[testType].command, testType);
      
      if (result.success) {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
      this.results.summary.total++;
    }
    
    // Generate final report
    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    await this.generateReport();
    
    return this.results.summary.failed === 0;
  }

  async generateReport() {
    this.logHeader('📊 Test Results Summary');
    
    // Console summary
    this.log(`Total Test Suites: ${this.results.summary.total}`, 'bright');
    this.log(`Passed: ${this.results.summary.passed}`, 'green');
    this.log(`Failed: ${this.results.summary.failed}`, this.results.summary.failed > 0 ? 'red' : 'green');
    this.log(`Duration: ${Math.round(this.results.duration / 1000)}s`, 'cyan');
    
    // Detailed results
    this.logSection('Detailed Results');
    for (const [testType, result] of Object.entries(this.results.tests)) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const color = result.success ? 'green' : 'red';
      this.log(`${status} ${config.testTypes[testType].name} (${result.duration}ms)`, color);
      
      if (!result.success && result.stderr) {
        this.log(`   Error: ${result.stderr.split('\n')[0]}`, 'red');
      }
    }
    
    // Generate JSON report
    const reportDir = 'test-results';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'test-runner-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    this.log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');
    
    // Generate HTML report
    await this.generateHtmlReport(reportDir);
  }

  async generateHtmlReport(reportDir) {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - Survey Application</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-results { margin-top: 30px; }
        .test-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ddd; }
        .test-item.pass { border-left-color: #28a745; }
        .test-item.fail { border-left-color: #dc3545; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-duration { color: #666; font-size: 0.9em; }
        .error-details { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Survey Application Test Results</h1>
            <p>Generated on ${this.results.endTime.toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${this.results.summary.total}</div>
                <div class="metric-label">Total Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${this.results.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${this.results.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(this.results.duration / 1000)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>Test Suite Results</h2>
            ${Object.entries(this.results.tests).map(([testType, result]) => `
                <div class="test-item ${result.success ? 'pass' : 'fail'}">
                    <div class="test-name">
                        ${result.success ? '✅' : '❌'} ${config.testTypes[testType].name}
                    </div>
                    <div class="test-duration">Duration: ${result.duration}ms</div>
                    ${!result.success && result.stderr ? `
                        <div class="error-details">
                            ${result.stderr.split('\n').slice(0, 5).join('<br>')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlPath = path.join(reportDir, 'test-runner-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    this.log(`📄 HTML report saved to: ${htmlPath}`, 'cyan');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  // Parse command line arguments
  let testTypes = ['unit', 'integration'];
  
  if (args.includes('--all')) {
    testTypes = ['unit', 'integration', 'e2e', 'visual'];
  } else if (args.includes('--e2e')) {
    testTypes = ['e2e'];
  } else if (args.includes('--visual')) {
    testTypes = ['visual'];
  } else if (args.includes('--unit')) {
    testTypes = ['unit'];
  } else if (args.includes('--integration')) {
    testTypes = ['integration'];
  } else if (args.includes('--ci')) {
    testTypes = ['unit', 'integration', 'e2e'];
  }
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Survey Application Test Runner

Usage: node scripts/test-runner.js [options]

Options:
  --all         Run all test types (unit, integration, e2e, visual)
  --unit        Run only unit tests
  --integration Run only integration tests
  --e2e         Run only E2E tests
  --visual      Run only visual regression tests
  --ci          Run CI test suite (unit, integration, e2e)
  --help, -h    Show this help message

Default: Runs unit and integration tests

Examples:
  node scripts/test-runner.js --all
  node scripts/test-runner.js --e2e
  node scripts/test-runner.js --ci
`);
    return;
  }
  
  // Run tests
  const success = await runner.runTestSuite(testTypes);
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;