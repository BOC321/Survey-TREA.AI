// Visual regression tests for charts

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Mock data for consistent visual testing
const mockChartData = {
  scoreDistribution: {
    labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
    datasets: [{
      label: 'Score Distribution',
      data: [2, 5, 12, 25, 18],
      backgroundColor: [
        '#ff6b6b',
        '#ffa726',
        '#ffee58',
        '#66bb6a',
        '#42a5f5'
      ]
    }]
  },
  responseTime: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Responses',
      data: [12, 19, 15, 25, 22, 30],
      borderColor: '#42a5f5',
      backgroundColor: 'rgba(66, 165, 245, 0.1)',
      tension: 0.4
    }]
  },
  categoryPerformance: {
    labels: ['Service Quality', 'Product Quality', 'User Experience', 'Support', 'Value'],
    datasets: [{
      label: 'Average Score',
      data: [85, 78, 92, 76, 88],
      backgroundColor: 'rgba(66, 165, 245, 0.2)',
      borderColor: '#42a5f5',
      pointBackgroundColor: '#42a5f5'
    }]
  }
};

test.describe('Chart Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Mock Chart.js and data
    await page.addInitScript(() => {
      // Mock Chart.js
      window.Chart = class {
        constructor(ctx, config) {
          this.ctx = ctx;
          this.config = config;
          this.data = config.data;
          this.options = config.options;
          this.canvas = ctx.canvas;
          
          // Set canvas size
          this.canvas.width = 400;
          this.canvas.height = 300;
          
          // Draw mock chart based on type
          this.draw();
        }
        
        draw() {
          const ctx = this.ctx;
          const canvas = this.canvas;
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Set consistent font
          ctx.font = '12px Arial';
          
          if (this.config.type === 'doughnut') {
            this.drawDoughnut(ctx);
          } else if (this.config.type === 'line') {
            this.drawLine(ctx);
          } else if (this.config.type === 'radar') {
            this.drawRadar(ctx);
          }
        }
        
        drawDoughnut(ctx) {
          const centerX = 200;
          const centerY = 150;
          const radius = 80;
          const innerRadius = 40;
          
          const data = this.data.datasets[0].data;
          const colors = this.data.datasets[0].backgroundColor;
          const total = data.reduce((sum, val) => sum + val, 0);
          
          let currentAngle = -Math.PI / 2;
          
          data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.labels[index], labelX, labelY);
            
            currentAngle += sliceAngle;
          });
        }
        
        drawLine(ctx) {
          const padding = 40;
          const chartWidth = 400 - 2 * padding;
          const chartHeight = 300 - 2 * padding;
          
          const data = this.data.datasets[0].data;
          const labels = this.data.labels;
          const maxValue = Math.max(...data);
          
          // Draw axes
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, padding);
          ctx.lineTo(padding, padding + chartHeight);
          ctx.lineTo(padding + chartWidth, padding + chartHeight);
          ctx.stroke();
          
          // Draw grid lines
          for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
          }
          
          // Draw data line
          ctx.strokeStyle = this.data.datasets[0].borderColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          
          ctx.stroke();
          
          // Draw data points
          ctx.fillStyle = this.data.datasets[0].borderColor;
          data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          // Draw labels
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          labels.forEach((label, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight + 20;
            ctx.fillText(label, x, y);
          });
        }
        
        drawRadar(ctx) {
          const centerX = 200;
          const centerY = 150;
          const radius = 100;
          
          const data = this.data.datasets[0].data;
          const labels = this.data.labels;
          const maxValue = Math.max(...data);
          const angleStep = (2 * Math.PI) / labels.length;
          
          // Draw grid
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          
          // Draw concentric circles
          for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, 2 * Math.PI);
            ctx.stroke();
          }
          
          // Draw spokes
          labels.forEach((_, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
          });
          
          // Draw data polygon
          ctx.strokeStyle = this.data.datasets[0].borderColor;
          ctx.fillStyle = this.data.datasets[0].backgroundColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          data.forEach((value, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const distance = (value / 100) * radius; // Assuming max value is 100
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw data points
          ctx.fillStyle = this.data.datasets[0].borderColor;
          data.forEach((value, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const distance = (value / 100) * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          // Draw labels
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          labels.forEach((label, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius + 20);
            const y = centerY + Math.sin(angle) * (radius + 20);
            
            ctx.fillText(label, x, y);
          });
        }
        
        update() {
          this.draw();
        }
        
        destroy() {
          // Cleanup
        }
        
        resize() {
          this.draw();
        }
      };
    });
    
    // Mock API responses with consistent data
    await page.route('**/api/analytics/responses', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: '1',
              timestamp: '2024-01-15T10:30:00Z',
              surveyTitle: 'Customer Satisfaction Survey',
              results: {
                score: 85,
                percentage: 85,
                categories: {
                  'Service Quality': 85,
                  'Product Quality': 78,
                  'User Experience': 92,
                  'Support': 76,
                  'Value': 88
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
                categories: {
                  'Service Quality': 70,
                  'Product Quality': 75,
                  'User Experience': 71,
                  'Support': 68,
                  'Value': 74
                }
              }
            }
          ]
        })
      });
    });
    
    // Navigate to analytics page
    await page.goto(`${BASE_URL}/analytics.html`);
    await page.waitForLoadState('networkidle');
    
    // Wait for charts to render
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000); // Additional wait for chart animation
  });
  
  test.describe('Individual Chart Screenshots', () => {
    test('should render score distribution chart consistently', async ({ page }) => {
      const chartContainer = page.locator('#score-distribution-chart');
      await expect(chartContainer).toBeVisible();
      
      // Take screenshot of the chart
      await expect(chartContainer).toHaveScreenshot('score-distribution-chart.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render response time chart consistently', async ({ page }) => {
      const chartContainer = page.locator('#response-time-chart');
      await expect(chartContainer).toBeVisible();
      
      await expect(chartContainer).toHaveScreenshot('response-time-chart.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render category performance chart consistently', async ({ page }) => {
      const chartContainer = page.locator('#category-performance-chart');
      await expect(chartContainer).toBeVisible();
      
      await expect(chartContainer).toHaveScreenshot('category-performance-chart.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
  });
  
  test.describe('Chart States', () => {
    test('should render charts with filtered data', async ({ page }) => {
      // Apply filters
      await page.selectOption('#score-range', 'high');
      await page.click('#apply-filters');
      
      // Wait for charts to update
      await page.waitForTimeout(1000);
      
      // Take screenshots of filtered charts
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-filtered.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
      
      await expect(page.locator('#response-time-chart')).toHaveScreenshot('response-time-filtered.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render empty state charts', async ({ page }) => {
      // Mock empty data response
      await page.route('**/api/analytics/responses', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: []
          })
        });
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Take screenshots of empty charts
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-empty.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render loading state charts', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/analytics/responses', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        });
      });
      
      // Reload and capture loading state
      await page.reload();
      await page.waitForSelector('.loading-indicator', { timeout: 5000 });
      
      // Take screenshot of loading state
      await expect(page.locator('.charts-container')).toHaveScreenshot('charts-loading.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
  });
  
  test.describe('Responsive Chart Layouts', () => {
    test('should render charts on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Take screenshots of mobile charts
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-mobile.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
      
      await expect(page.locator('#response-time-chart')).toHaveScreenshot('response-time-mobile.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render charts on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Take screenshots of tablet charts
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-tablet.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
      
      await expect(page.locator('#category-performance-chart')).toHaveScreenshot('category-performance-tablet.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
    
    test('should render charts on large desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);
      
      // Take screenshot of full dashboard
      await expect(page.locator('.charts-container')).toHaveScreenshot('charts-desktop-large.png', {
        threshold: 0.2,
        maxDiffPixels: 2000
      });
    });
  });
  
  test.describe('Chart Interactions', () => {
    test('should render chart hover states', async ({ page }) => {
      // Hover over chart element
      await page.hover('#score-distribution-chart canvas');
      await page.waitForTimeout(500);
      
      // Take screenshot with hover state
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-hover.png', {
        threshold: 0.3,
        maxDiffPixels: 1500
      });
    });
    
    test('should render chart with custom colors', async ({ page }) => {
      // Apply custom theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      
      await page.waitForTimeout(500);
      
      // Take screenshots with dark theme
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-dark.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
  });
  
  test.describe('Chart Error States', () => {
    test('should render chart error state', async ({ page }) => {
      // Mock Chart.js error
      await page.evaluate(() => {
        window.Chart = class {
          constructor() {
            throw new Error('Chart rendering failed');
          }
        };
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Take screenshot of error state
      await expect(page.locator('.charts-container')).toHaveScreenshot('charts-error.png', {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
  });
  
  test.describe('Full Dashboard Layout', () => {
    test('should render complete dashboard layout', async ({ page }) => {
      // Take full page screenshot
      await expect(page).toHaveScreenshot('dashboard-full.png', {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 3000
      });
    });
    
    test('should render dashboard with all filters applied', async ({ page }) => {
      // Apply multiple filters
      await page.fill('#start-date', '2024-01-15');
      await page.fill('#end-date', '2024-01-16');
      await page.selectOption('#score-range', 'medium');
      await page.click('#apply-filters');
      
      await page.waitForTimeout(1000);
      
      // Take screenshot with filters
      await expect(page).toHaveScreenshot('dashboard-filtered.png', {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 3000
      });
    });
  });
  
  test.describe('Chart Animation States', () => {
    test('should capture chart mid-animation', async ({ page }) => {
      // Trigger chart update
      await page.click('#reset-filters');
      
      // Capture during animation (if any)
      await page.waitForTimeout(200);
      
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot('score-distribution-animation.png', {
        threshold: 0.3,
        maxDiffPixels: 1500
      });
    });
  });
  
  test.describe('Cross-browser Consistency', () => {
    test('should render consistently across different browsers', async ({ page, browserName }) => {
      // Take browser-specific screenshots
      await expect(page.locator('#score-distribution-chart')).toHaveScreenshot(`score-distribution-${browserName}.png`, {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
      
      await expect(page.locator('#response-time-chart')).toHaveScreenshot(`response-time-${browserName}.png`, {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
      
      await expect(page.locator('#category-performance-chart')).toHaveScreenshot(`category-performance-${browserName}.png`, {
        threshold: 0.2,
        maxDiffPixels: 1000
      });
    });
  });
});