// Playwright configuration for E2E and visual regression tests

const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/e2e',
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/e2e',
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/e2e',
    },
    
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './tests/e2e',
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testDir: './tests/e2e',
    },
    
    /* Visual regression tests */
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent settings for visual tests
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: 1,
      },
      testDir: './tests/visual',
      expect: {
        // Visual comparison settings
        toHaveScreenshot: {
          threshold: 0.2,
          maxDiffPixels: 1000,
        },
      },
    },
    
    {
      name: 'visual-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: 1,
      },
      testDir: './tests/visual',
      expect: {
        toHaveScreenshot: {
          threshold: 0.2,
          maxDiffPixels: 1000,
        },
      },
    },
    
    {
      name: 'visual-webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: 1,
      },
      testDir: './tests/visual',
      expect: {
        toHaveScreenshot: {
          threshold: 0.2,
          maxDiffPixels: 1000,
        },
      },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.js'),
  globalTeardown: require.resolve('./tests/global-teardown.js'),
  
  /* Test timeout */
  timeout: 30000,
  
  /* Expect timeout */
  expect: {
    timeout: 5000,
  },
  
  /* Output directory for test artifacts */
  outputDir: 'test-results/',
  
  /* Preserve output directory */
  preserveOutput: 'failures-only',
});