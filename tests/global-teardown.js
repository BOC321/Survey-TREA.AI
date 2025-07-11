// Global teardown for Playwright tests

const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up test storage
  await cleanupTestStorage();
  
  // Generate test report summary
  await generateTestSummary();
  
  // Clean up temporary files (optional)
  await cleanupTempFiles();
  
  console.log('✅ Global teardown completed successfully');
}

async function cleanupTestStorage() {
  console.log('🗑️  Cleaning up test storage...');
  
  const testStorageDir = path.join(process.cwd(), 'test-storage');
  
  if (fs.existsSync(testStorageDir)) {
    try {
      // Remove test storage directory and contents
      fs.rmSync(testStorageDir, { recursive: true, force: true });
      console.log('✅ Test storage cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not clean up test storage:', error.message);
    }
  }
  
  // Clean up environment variables
  delete process.env.TEST_STORAGE_DIR;
  delete process.env.TEST_RESULTS_DIR;
  delete process.env.TEST_EMAIL_FILE;
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  const resultsFile = path.join(process.cwd(), 'test-results/results.json');
  
  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        projects: results.suites?.map(suite => ({
          name: suite.title,
          tests: suite.specs?.length || 0,
          passed: suite.specs?.filter(spec => spec.ok).length || 0,
          failed: suite.specs?.filter(spec => !spec.ok).length || 0
        })) || []
      };
      
      // Write summary to file
      fs.writeFileSync(
        path.join(process.cwd(), 'test-results/summary.json'),
        JSON.stringify(summary, null, 2)
      );
      
      // Log summary to console
      console.log('📈 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
      
      if (summary.projects.length > 0) {
        console.log('   Projects:');
        summary.projects.forEach(project => {
          console.log(`     ${project.name}: ${project.passed}/${project.tests} passed`);
        });
      }
      
      console.log('✅ Test summary generated');
      
    } catch (error) {
      console.warn('⚠️  Could not generate test summary:', error.message);
    }
  } else {
    console.log('ℹ️  No test results file found');
  }
}

async function cleanupTempFiles() {
  console.log('🧽 Cleaning up temporary files...');
  
  const tempPaths = [
    // Clean up any temporary screenshots that are not needed
    path.join(process.cwd(), 'test-results/temp'),
    // Clean up any temporary downloads
    path.join(process.cwd(), 'test-results/downloads')
  ];
  
  tempPaths.forEach(tempPath => {
    if (fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
        console.log(`✅ Cleaned up: ${path.basename(tempPath)}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean up ${tempPath}:`, error.message);
      }
    }
  });
  
  // Keep important artifacts but clean up unnecessary ones
  const keepOnlyOnFailure = process.env.CI === 'true';
  
  if (keepOnlyOnFailure) {
    console.log('🔄 CI mode: Keeping only failure artifacts');
    
    const videosDir = path.join(process.cwd(), 'test-results/videos');
    const tracesDir = path.join(process.cwd(), 'test-results/traces');
    
    // In CI, we might want to clean up videos and traces for passed tests
    // This would require parsing the test results to identify which artifacts to keep
    // For now, we'll keep all artifacts as configured in playwright.config.js
  }
  
  console.log('✅ Temporary files cleanup completed');
}

module.exports = globalTeardown;