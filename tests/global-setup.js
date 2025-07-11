// Global setup for Playwright tests

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Create test directories
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'tests/fixtures',
    'tests/visual/screenshots'
  ];
  
  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Create test fixtures
  await createTestFixtures();
  
  // Setup test database/storage
  await setupTestStorage();
  
  // Verify server is running or start it
  await verifyServer(config);
  
  console.log('✅ Global setup completed successfully');
}

async function createTestFixtures() {
  console.log('📝 Creating test fixtures...');
  
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures');
  
  // Mock survey data
  const mockSurveyData = [
    {
      id: 'test-1',
      timestamp: '2024-01-15T10:30:00Z',
      surveyTitle: 'Customer Satisfaction Survey',
      results: {
        score: 85,
        percentage: 85,
        answers: {
          'question1': 'Excellent',
          'question2': 'Good',
          'question3': 'Very Satisfied'
        },
        categories: {
          'Service Quality': 90,
          'Product Quality': 80,
          'User Experience': 85
        }
      }
    },
    {
      id: 'test-2',
      timestamp: '2024-01-16T14:20:00Z',
      surveyTitle: 'Product Feedback Survey',
      results: {
        score: 72,
        percentage: 72,
        answers: {
          'question1': 'Good',
          'question2': 'Average',
          'question3': 'Satisfied'
        },
        categories: {
          'Service Quality': 70,
          'Product Quality': 75,
          'User Experience': 71
        }
      }
    },
    {
      id: 'test-3',
      timestamp: '2024-01-17T09:15:00Z',
      surveyTitle: 'Website Usability Survey',
      results: {
        score: 93,
        percentage: 93,
        answers: {
          'question1': 'Excellent',
          'question2': 'Excellent',
          'question3': 'Very Satisfied'
        },
        categories: {
          'Service Quality': 95,
          'Product Quality': 90,
          'User Experience': 94
        }
      }
    }
  ];
  
  // Mock email data
  const mockEmailData = [
    {
      email: 'test1@example.com',
      timestamp: '2024-01-15T10:30:00Z',
      surveyTitle: 'Customer Satisfaction Survey',
      results: { percentage: 85 }
    },
    {
      email: 'test2@example.com',
      timestamp: '2024-01-16T14:20:00Z',
      surveyTitle: 'Product Feedback Survey',
      results: { percentage: 72 }
    },
    {
      email: 'test3@example.com',
      timestamp: '2024-01-17T09:15:00Z',
      surveyTitle: 'Website Usability Survey',
      results: { percentage: 93 }
    }
  ];
  
  // Write fixtures to files
  fs.writeFileSync(
    path.join(fixturesDir, 'survey-data.json'),
    JSON.stringify(mockSurveyData, null, 2)
  );
  
  fs.writeFileSync(
    path.join(fixturesDir, 'email-data.json'),
    JSON.stringify(mockEmailData, null, 2)
  );
  
  // Create individual survey files
  mockSurveyData.forEach((survey, index) => {
    fs.writeFileSync(
      path.join(fixturesDir, `survey-${index + 1}.json`),
      JSON.stringify(survey, null, 2)
    );
  });
  
  console.log('✅ Test fixtures created');
}

async function setupTestStorage() {
  console.log('💾 Setting up test storage...');
  
  // Create test storage directories
  const testStorageDirs = [
    'test-storage',
    'test-storage/results',
    'test-storage/emails'
  ];
  
  testStorageDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  
  // Set environment variables for test storage
  process.env.TEST_STORAGE_DIR = path.join(process.cwd(), 'test-storage');
  process.env.TEST_RESULTS_DIR = path.join(process.cwd(), 'test-storage/results');
  process.env.TEST_EMAIL_FILE = path.join(process.cwd(), 'test-storage/emails/test-emails.json');
  
  console.log('✅ Test storage setup completed');
}

async function verifyServer(config) {
  console.log('🌐 Verifying server availability...');
  
  const baseURL = config.use?.baseURL || 'http://localhost:3000';
  
  try {
    // Try to connect to the server
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set a shorter timeout for server check
    page.setDefaultTimeout(10000);
    
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Check if the main page loads
    const title = await page.title();
    console.log(`📄 Server responded with page title: "${title}"`);
    
    await browser.close();
    console.log('✅ Server is running and accessible');
    
  } catch (error) {
    console.warn(`⚠️  Could not verify server at ${baseURL}:`, error.message);
    console.log('🔄 Server will be started by webServer configuration');
  }
}

module.exports = globalSetup;