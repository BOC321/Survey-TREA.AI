// E2E tests for dashboard functionality using Playwright

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_DATA_DIR = path.join(__dirname, '../fixtures');

// Mock data for testing
const mockSurveyData = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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

test.describe('Analytics Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock API responses
    await page.route('**/api/analytics/responses', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockSurveyData
        })
      });
    });
    
    await page.route('**/api/analytics/emails', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { email: 'user1@example.com', timestamp: '2024-01-15T10:30:00Z' },
            { email: 'user2@example.com', timestamp: '2024-01-16T14:20:00Z' },
            { email: 'user3@example.com', timestamp: '2024-01-17T09:15:00Z' }
          ]
        })
      });
    });
    
    // Navigate to analytics page
    await page.goto(`${BASE_URL}/analytics.html`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });
  
  test.describe('Dashboard Loading and Initialization', () => {
    test('should load analytics dashboard successfully', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Survey Analytics Dashboard/);
      
      // Check main dashboard elements
      await expect(page.locator('.dashboard-container')).toBeVisible();
      await expect(page.locator('.metrics-grid')).toBeVisible();
      await expect(page.locator('.charts-container')).toBeVisible();
    });
    
    test('should display loading states initially', async ({ page }) => {
      // Check for loading indicators
      await expect(page.locator('.loading-indicator')).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForSelector('.loading-indicator', { state: 'hidden', timeout: 10000 });
      
      // Verify content is loaded
      await expect(page.locator('.metric-card')).toHaveCount(4);
    });
    
    test('should load Chart.js dynamically', async ({ page }) => {
      // Check that Chart.js is loaded
      const chartJSLoaded = await page.evaluate(() => {
        return typeof window.Chart !== 'undefined';
      });
      
      expect(chartJSLoaded).toBe(true);
    });
    
    test('should initialize all charts', async ({ page }) => {
      // Wait for charts to be created
      await page.waitForSelector('canvas', { timeout: 10000 });
      
      // Check that all expected charts are present
      const canvasElements = await page.locator('canvas').count();
      expect(canvasElements).toBeGreaterThanOrEqual(3); // Score distribution, response time, category performance
    });
  });
  
  test.describe('Metrics Display', () => {
    test('should display correct metrics', async ({ page }) => {
      // Wait for metrics to load
      await page.waitForSelector('.metric-value', { timeout: 10000 });
      
      // Check total responses
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(totalResponses).toBe('3');
      
      // Check average score
      const averageScore = await page.locator('[data-metric="average-score"] .metric-value').textContent();
      expect(parseFloat(averageScore)).toBeCloseTo(83.3, 1);
      
      // Check high score count
      const highScoreCount = await page.locator('[data-metric="high-score-count"] .metric-value').textContent();
      expect(highScoreCount).toBe('2');
      
      // Check completion rate
      const completionRate = await page.locator('[data-metric="completion-rate"] .metric-value').textContent();
      expect(completionRate).toContain('%');
    });
    
    test('should update metrics when filters are applied', async ({ page }) => {
      // Apply date filter
      await page.fill('#start-date', '2024-01-16');
      await page.fill('#end-date', '2024-01-17');
      await page.click('#apply-filters');
      
      // Wait for update
      await page.waitForTimeout(1000);
      
      // Check updated total responses
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(totalResponses).toBe('2');
    });
  });
  
  test.describe('Chart Functionality', () => {
    test('should render score distribution chart', async ({ page }) => {
      // Wait for chart to render
      await page.waitForSelector('#score-distribution-chart canvas', { timeout: 10000 });
      
      // Check chart is visible
      await expect(page.locator('#score-distribution-chart canvas')).toBeVisible();
      
      // Check chart has data
      const chartExists = await page.evaluate(() => {
        const canvas = document.querySelector('#score-distribution-chart canvas');
        return canvas && canvas.getContext('2d');
      });
      
      expect(chartExists).toBeTruthy();
    });
    
    test('should render response time chart', async ({ page }) => {
      await page.waitForSelector('#response-time-chart canvas', { timeout: 10000 });
      await expect(page.locator('#response-time-chart canvas')).toBeVisible();
    });
    
    test('should render category performance chart', async ({ page }) => {
      await page.waitForSelector('#category-performance-chart canvas', { timeout: 10000 });
      await expect(page.locator('#category-performance-chart canvas')).toBeVisible();
    });
    
    test('should update charts when data changes', async ({ page }) => {
      // Get initial chart data
      const initialChartData = await page.evaluate(() => {
        const chart = window.dashboard?.chartManager?.charts?.scoreDistribution;
        return chart ? chart.data.datasets[0].data : null;
      });
      
      // Apply filter
      await page.selectOption('#score-range', 'high');
      await page.click('#apply-filters');
      
      // Wait for chart update
      await page.waitForTimeout(1000);
      
      // Get updated chart data
      const updatedChartData = await page.evaluate(() => {
        const chart = window.dashboard?.chartManager?.charts?.scoreDistribution;
        return chart ? chart.data.datasets[0].data : null;
      });
      
      expect(updatedChartData).not.toEqual(initialChartData);
    });
    
    test('should handle chart resize', async ({ page }) => {
      // Change viewport size
      await page.setViewportSize({ width: 800, height: 600 });
      
      // Wait for resize
      await page.waitForTimeout(500);
      
      // Check charts are still visible
      await expect(page.locator('#score-distribution-chart canvas')).toBeVisible();
      await expect(page.locator('#response-time-chart canvas')).toBeVisible();
      await expect(page.locator('#category-performance-chart canvas')).toBeVisible();
    });
  });
  
  test.describe('Filtering Functionality', () => {
    test('should apply date range filters', async ({ page }) => {
      // Set date range
      await page.fill('#start-date', '2024-01-16');
      await page.fill('#end-date', '2024-01-16');
      await page.click('#apply-filters');
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Check that only one response is shown
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(totalResponses).toBe('1');
    });
    
    test('should apply score range filters', async ({ page }) => {
      // Select high score range
      await page.selectOption('#score-range', 'high');
      await page.click('#apply-filters');
      
      await page.waitForTimeout(1000);
      
      // Check filtered results
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(parseInt(totalResponses)).toBeLessThan(3);
    });
    
    test('should apply survey title filters', async ({ page }) => {
      // Select specific survey
      await page.selectOption('#survey-title', 'Customer Satisfaction Survey');
      await page.click('#apply-filters');
      
      await page.waitForTimeout(1000);
      
      // Check filtered results
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(totalResponses).toBe('1');
    });
    
    test('should reset filters', async ({ page }) => {
      // Apply some filters
      await page.fill('#start-date', '2024-01-16');
      await page.selectOption('#score-range', 'high');
      await page.click('#apply-filters');
      
      await page.waitForTimeout(1000);
      
      // Reset filters
      await page.click('#reset-filters');
      
      await page.waitForTimeout(1000);
      
      // Check that all data is shown again
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(totalResponses).toBe('3');
      
      // Check that form fields are cleared
      const startDate = await page.inputValue('#start-date');
      const scoreRange = await page.inputValue('#score-range');
      
      expect(startDate).toBe('');
      expect(scoreRange).toBe('');
    });
    
    test('should combine multiple filters', async ({ page }) => {
      // Apply multiple filters
      await page.fill('#start-date', '2024-01-15');
      await page.fill('#end-date', '2024-01-17');
      await page.selectOption('#score-range', 'medium');
      await page.click('#apply-filters');
      
      await page.waitForTimeout(1000);
      
      // Check combined filter results
      const totalResponses = await page.locator('[data-metric="total-responses"] .metric-value').textContent();
      expect(parseInt(totalResponses)).toBeGreaterThanOrEqual(0);
    });
  });
  
  test.describe('Export Functionality', () => {
    test('should export to PDF', async ({ page }) => {
      // Mock jsPDF loading
      await page.addInitScript(() => {
        window.jsPDF = class {
          constructor() {
            this.internal = { pageSize: { width: 210, height: 297 } };
          }
          text() { return this; }
          addImage() { return this; }
          save() { return this; }
          output() { return 'mock-pdf-data'; }
        };
      });
      
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      
      // Click export PDF button
      await page.click('#export-pdf');
      
      // Wait for loading indicator
      await expect(page.locator('#pdf-loading')).toBeVisible();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Check download properties
      expect(download.suggestedFilename()).toContain('survey-analytics');
      expect(download.suggestedFilename()).toContain('.pdf');
    });
    
    test('should export to CSV', async ({ page }) => {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      
      // Click export CSV button
      await page.click('#export-csv');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Check download properties
      expect(download.suggestedFilename()).toContain('survey-data');
      expect(download.suggestedFilename()).toContain('.csv');
    });
    
    test('should handle export errors gracefully', async ({ page }) => {
      // Mock export error
      await page.evaluate(() => {
        window.dashboard.exportToPDF = async () => {
          throw new Error('Export failed');
        };
      });
      
      // Try to export
      await page.click('#export-pdf');
      
      // Check error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('export');
    });
  });
  
  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile layout
      await expect(page.locator('.dashboard-container')).toBeVisible();
      
      // Check that charts are responsive
      const chartWidth = await page.locator('#score-distribution-chart canvas').evaluate(el => el.width);
      expect(chartWidth).toBeLessThan(400);
    });
    
    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check tablet layout
      await expect(page.locator('.dashboard-container')).toBeVisible();
      await expect(page.locator('.metrics-grid')).toBeVisible();
    });
    
    test('should adapt filter controls on small screens', async ({ page }) => {
      // Set small viewport
      await page.setViewportSize({ width: 320, height: 568 });
      
      // Check that filter controls are accessible
      await expect(page.locator('.filters-container')).toBeVisible();
      await expect(page.locator('#apply-filters')).toBeVisible();
      await expect(page.locator('#reset-filters')).toBeVisible();
    });
  });
  
  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/analytics/responses', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      // Reload page
      await page.reload();
      
      // Check error handling
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('error');
    });
    
    test('should handle network errors', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/analytics/**', async route => {
        await route.abort('failed');
      });
      
      // Reload page
      await page.reload();
      
      // Check offline handling
      await expect(page.locator('.offline-message')).toBeVisible();
    });
    
    test('should handle Chart.js loading errors', async ({ page }) => {
      // Mock Chart.js loading failure
      await page.route('**/Chart.min.js', async route => {
        await route.abort('failed');
      });
      
      // Reload page
      await page.reload();
      
      // Check fallback behavior
      await expect(page.locator('.chart-error')).toBeVisible();
    });
  });
  
  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/analytics.html`);
      await page.waitForSelector('.metric-card', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });
    
    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      const largeDataset = Array(1000).fill().map((_, i) => ({
        id: `${i + 1}`,
        timestamp: new Date(2024, 0, 1 + (i % 30)).toISOString(),
        surveyTitle: `Survey ${i + 1}`,
        results: {
          score: 50 + Math.random() * 50,
          percentage: 50 + Math.random() * 50,
          answers: { question1: 'Answer' },
          categories: { Category1: 50 + Math.random() * 50 }
        }
      }));
      
      await page.route('**/api/analytics/responses', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: largeDataset
          })
        });
      });
      
      // Reload with large dataset
      await page.reload();
      
      // Check that page still loads and functions
      await page.waitForSelector('.metric-card', { timeout: 15000 });
      await expect(page.locator('[data-metric="total-responses"] .metric-value')).toContainText('1000');
    });
  });
  
  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check that focus is visible
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
    
    test('should have proper ARIA labels', async ({ page }) => {
      // Check for ARIA labels on interactive elements
      await expect(page.locator('#apply-filters')).toHaveAttribute('aria-label');
      await expect(page.locator('#reset-filters')).toHaveAttribute('aria-label');
      await expect(page.locator('#export-pdf')).toHaveAttribute('aria-label');
    });
    
    test('should have proper heading structure', async ({ page }) => {
      // Check heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
      
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThan(0);
    });
  });
});