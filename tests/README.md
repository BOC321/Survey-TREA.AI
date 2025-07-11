# Testing Documentation

This document provides comprehensive information about the testing setup for the Survey Application, including unit tests, integration tests, E2E tests, and visual regression tests.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

Our testing strategy follows a comprehensive approach with multiple layers:

- **Unit Tests**: Fast, isolated tests for individual functions and modules
- **Integration Tests**: Tests for API endpoints and service interactions
- **E2E Tests**: End-to-end tests for complete user workflows
- **Visual Regression Tests**: Visual comparison tests for UI consistency

## 🧪 Test Types

### Unit Tests
- **Location**: `tests/unit/`
- **Framework**: Jest with JSDOM
- **Purpose**: Test individual functions, classes, and modules in isolation
- **Coverage**: DataService, ChartManager, ChartLoader, ExportService

### Integration Tests
- **Location**: `tests/integration/`
- **Framework**: Jest with Supertest
- **Purpose**: Test API endpoints and service interactions
- **Coverage**: Analytics API, Survey API, Email service, PDF generation

### E2E Tests
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Purpose**: Test complete user workflows and interactions
- **Coverage**: Dashboard functionality, filtering, exports, responsive design

### Visual Regression Tests
- **Location**: `tests/visual/`
- **Framework**: Playwright with screenshot comparison
- **Purpose**: Ensure UI consistency across different browsers and viewports
- **Coverage**: Chart rendering, responsive layouts, theme variations

## ⚙️ Setup

### Prerequisites

1. **Node.js** (>= 14.0.0)
2. **npm** (>= 6.0.0)

### Installation

```bash
# Install all dependencies
npm install

# Install Playwright browsers (for E2E and visual tests)
npm run playwright:install
```

### Configuration Files

- `jest.config.js` - Jest configuration for unit and integration tests
- `playwright.config.js` - Playwright configuration for E2E and visual tests
- `tests/setup.js` - Jest setup file with mocks and utilities
- `tests/global-setup.js` - Playwright global setup
- `tests/global-teardown.js` - Playwright global teardown

## 🚀 Running Tests

### Quick Commands

```bash
# Run all tests (unit + integration)
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual

# Run all test types
npm run test:all

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Commands

```bash
# Run E2E tests on all browsers
npm run test:e2e:all

# Run visual tests on all browsers
npm run test:visual:all

# Update visual snapshots
npm run playwright:update-snapshots

# Run CI test suite
npm run test:ci
```

### Using the Test Runner Script

```bash
# Run with custom test runner
node scripts/test-runner.js --all
node scripts/test-runner.js --e2e
node scripts/test-runner.js --visual
node scripts/test-runner.js --ci

# Show help
node scripts/test-runner.js --help
```

## 📁 Test Structure

```
tests/
├── unit/                     # Unit tests
│   ├── DataService.test.js
│   ├── ChartManager.test.js
│   ├── ChartLoader.test.js
│   └── ExportService.test.js
├── integration/              # Integration tests
│   └── api.test.js
├── e2e/                      # E2E tests
│   └── dashboard.test.js
├── visual/                   # Visual regression tests
│   ├── charts.test.js
│   └── screenshots/          # Generated screenshots
├── fixtures/                 # Test data and fixtures
│   ├── survey-data.json
│   └── email-data.json
├── setup.js                  # Jest setup
├── global-setup.js           # Playwright global setup
├── global-teardown.js        # Playwright global teardown
└── README.md                 # This file
```

## ✍️ Writing Tests

### Unit Test Example

```javascript
// tests/unit/MyModule.test.js
const MyModule = require('../../modules/MyModule');

describe('MyModule', () => {
  let myModule;
  
  beforeEach(() => {
    myModule = new MyModule();
  });
  
  test('should perform expected operation', () => {
    const result = myModule.doSomething('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const app = require('../../app');

describe('API Endpoints', () => {
  test('GET /api/analytics/responses', async () => {
    const response = await request(app)
      .get('/api/analytics/responses')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

### E2E Test Example

```javascript
// tests/e2e/dashboard.test.js
const { test, expect } = require('@playwright/test');

test('should load dashboard and display charts', async ({ page }) => {
  await page.goto('/analytics.html');
  
  await expect(page.locator('.dashboard-container')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(3);
});
```

### Visual Test Example

```javascript
// tests/visual/charts.test.js
const { test, expect } = require('@playwright/test');

test('should render score distribution chart consistently', async ({ page }) => {
  await page.goto('/analytics.html');
  
  const chart = page.locator('#score-distribution-chart');
  await expect(chart).toHaveScreenshot('score-distribution.png');
});
```

## 🔧 Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'modules/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Playwright Configuration

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] }
  ]
};
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npm run playwright:install
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: test-results/
```

## 🐛 Troubleshooting

### Common Issues

#### Jest Tests Failing

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm run test:unit -- --verbose
```

#### Playwright Tests Failing

```bash
# Update Playwright browsers
npm run playwright:install

# Run tests in headed mode for debugging
npx playwright test --headed

# Generate new screenshots
npm run playwright:update-snapshots
```

#### Visual Tests Failing

```bash
# Update visual snapshots
npx playwright test --update-snapshots

# Run visual tests with threshold adjustment
npx playwright test --config=playwright.config.js --project=visual-chromium
```

### Debug Mode

```bash
# Debug Playwright tests
npx playwright test --debug

# Debug specific test
npx playwright test tests/e2e/dashboard.test.js --debug

# Run Jest tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Environment Variables

```bash
# Set base URL for tests
export BASE_URL=http://localhost:3000

# Enable debug logging
export DEBUG=pw:api

# Set test timeout
export PLAYWRIGHT_TEST_TIMEOUT=60000
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/coverage-final.json` - JSON coverage data

### Viewing Coverage

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🎯 Best Practices

### Unit Tests
- Test one thing at a time
- Use descriptive test names
- Mock external dependencies
- Aim for high code coverage

### Integration Tests
- Test real API interactions
- Use test databases/storage
- Clean up after each test
- Test error scenarios

### E2E Tests
- Test critical user journeys
- Use page object patterns
- Keep tests independent
- Use stable selectors

### Visual Tests
- Use consistent viewports
- Wait for animations to complete
- Use appropriate thresholds
- Test across browsers

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Visual Testing Guide](https://playwright.dev/docs/test-screenshots)

---

**Happy Testing! 🧪**