// Unit tests for ChartManager module

const fs = require('fs');
const path = require('path');
const ChartManager = require('../../modules/ChartManager');
const ChartLoader = require('../../modules/ChartLoader');
const DataService = require('../../modules/DataService');

// Mock chart instances
const mockChartInstance = {
  destroy: jest.fn(),
  update: jest.fn(),
  resize: jest.fn(),
  data: {
    labels: [],
    datasets: []
  },
  options: {}
};

// Load ChartManager class
let ChartManager;

beforeAll(() => {
  // Enhanced Chart.js mock
  global.Chart = jest.fn().mockImplementation((ctx, config) => {
    const instance = {
      ...mockChartInstance,
      config: config,
      ctx: ctx,
      data: config.data || { labels: [], datasets: [] },
      options: config.options || {}
    };
    return instance;
  });

  global.Chart.register = jest.fn();
  global.Chart.version = '4.0.0';

  // Mock ChartLoader
  global.ChartLoader = {
    loadChartJS: jest.fn(() => Promise.resolve()),
    isChartJSLoaded: jest.fn(() => true)
  };

  // Load the ChartManager module
  const chartManagerPath = path.join(__dirname, '../../modules/ChartManager.js');
  const chartManagerCode = fs.readFileSync(chartManagerPath, 'utf8');
  eval(chartManagerCode);
  global.ChartManager = ChartManager;
});

describe('ChartManager', () => {
  let chartManager;
  let mockDataService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock DataService
    mockDataService = {
      getChartData: jest.fn(),
      getFilteredData: jest.fn(() => []),
      getCategoryStats: jest.fn(() => ({})),
      getMetrics: jest.fn(() => ({
        totalResponses: 100,
        averageScore: 75,
        highScoreCount: 30
      }))
    };

    chartManager = new ChartManager();
    chartManager.dataService = mockDataService;

    // Add canvas elements to DOM
    const canvasIds = ['scoreDistributionChart', 'responsesTimeChart', 'categoryPerformanceChart'];
    canvasIds.forEach(id => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      canvas.width = 400;
      canvas.height = 200;
      document.body.appendChild(canvas);
    });
  });

  afterEach(() => {
    // Clean up DOM
    document.querySelectorAll('canvas').forEach(canvas => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    });
  });

  describe('Constructor', () => {
    test('should initialize with empty charts object', () => {
      expect(chartManager.charts).toEqual({});
      expect(chartManager.config).toBeDefined();
    });
  });

  describe('initializeCharts', () => {
    test('should load Chart.js and initialize all charts', async () => {
      mockDataService.getChartData.mockImplementation((type) => {
        switch (type) {
          case 'scoreDistribution':
            return {
              labels: ['High', 'Medium', 'Low'],
              datasets: [{ data: [30, 50, 20], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }]
            };
          case 'timeSeries':
            return {
              labels: ['Jan', 'Feb', 'Mar'],
              datasets: [{ data: [10, 20, 15], borderColor: '#007bff' }]
            };
          case 'categoryPerformance':
            return {
              labels: ['Service', 'Product', 'Support'],
              datasets: [{ data: [80, 75, 85], backgroundColor: '#17a2b8' }]
            };
          default:
            return { labels: [], datasets: [] };
        }
      });

      await chartManager.initializeCharts();

      expect(global.ChartLoader.loadChartJS).toHaveBeenCalled();
      expect(chartManager.charts.scoreDistribution).toBeDefined();
      expect(chartManager.charts.responsesTime).toBeDefined();
      expect(chartManager.charts.categoryPerformance).toBeDefined();
    });

    test('should handle Chart.js loading failure', async () => {
      global.ChartLoader.loadChartJS.mockRejectedValueOnce(new Error('Failed to load Chart.js'));

      await chartManager.initializeCharts();

      expect(console.error).toHaveBeenCalledWith('Failed to load Chart.js:', expect.any(Error));
      expect(Object.keys(chartManager.charts)).toHaveLength(0);
    });

    test('should not reinitialize if charts already exist', async () => {
      chartManager.charts.scoreDistribution = mockChartInstance;

      await chartManager.initializeCharts();

      expect(global.ChartLoader.loadChartJS).not.toHaveBeenCalled();
    });
  });

  describe('createScoreDistributionChart', () => {
    test('should create doughnut chart with correct configuration', () => {
      const mockData = {
        labels: ['High (80-100%)', 'Medium (60-79%)', 'Low (0-59%)'],
        datasets: [{
          data: [30, 50, 20],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545']
        }]
      };

      const chart = chartManager.createScoreDistributionChart('scoreDistributionChart', mockData);

      expect(global.Chart).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          type: 'doughnut',
          data: mockData,
          options: expect.objectContaining({
            responsive: true,
            plugins: expect.objectContaining({
              title: expect.objectContaining({
                display: true,
                text: 'Score Distribution'
              })
            })
          })
        })
      );

      expect(chart).toBeDefined();
    });

    test('should handle missing canvas element', () => {
      const chart = chartManager.createScoreDistributionChart('nonexistentCanvas', {});
      expect(chart).toBeNull();
    });
  });

  describe('createResponsesTimeChart', () => {
    test('should create line chart with correct configuration', () => {
      const mockData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
          label: 'Responses',
          data: [10, 20, 15, 25],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)'
        }]
      };

      const chart = chartManager.createResponsesTimeChart('responsesTimeChart', mockData);

      expect(global.Chart).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          type: 'line',
          data: mockData,
          options: expect.objectContaining({
            responsive: true,
            scales: expect.objectContaining({
              y: expect.objectContaining({
                beginAtZero: true
              })
            })
          })
        })
      );

      expect(chart).toBeDefined();
    });
  });

  describe('createCategoryPerformanceChart', () => {
    test('should create radar chart with correct configuration', () => {
      const mockData = {
        labels: ['Service Quality', 'Product Quality', 'Support Quality'],
        datasets: [{
          label: 'Performance',
          data: [80, 75, 85],
          backgroundColor: 'rgba(23, 162, 184, 0.2)',
          borderColor: '#17a2b8'
        }]
      };

      const chart = chartManager.createCategoryPerformanceChart('categoryPerformanceChart', mockData);

      expect(global.Chart).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          type: 'radar',
          data: mockData,
          options: expect.objectContaining({
            responsive: true,
            scales: expect.objectContaining({
              r: expect.objectContaining({
                beginAtZero: true,
                max: 100
              })
            })
          })
        })
      );

      expect(chart).toBeDefined();
    });
  });

  describe('updateCharts', () => {
    beforeEach(async () => {
      mockDataService.getChartData.mockReturnValue({
        labels: ['Test'],
        datasets: [{ data: [1] }]
      });
      
      await chartManager.initializeCharts();
    });

    test('should update all existing charts', async () => {
      await chartManager.updateCharts();

      Object.values(chartManager.charts).forEach(chart => {
        expect(chart.update).toHaveBeenCalled();
      });
    });

    test('should initialize charts if not already initialized', async () => {
      chartManager.charts = {};
      
      await chartManager.updateCharts();

      expect(global.ChartLoader.loadChartJS).toHaveBeenCalled();
    });

    test('should handle update errors gracefully', async () => {
      const errorChart = {
        ...mockChartInstance,
        update: jest.fn(() => { throw new Error('Update failed'); })
      };
      chartManager.charts.scoreDistribution = errorChart;

      await chartManager.updateCharts();

      expect(console.error).toHaveBeenCalledWith('Error updating charts:', expect.any(Error));
    });
  });

  describe('destroyCharts', () => {
    beforeEach(async () => {
      mockDataService.getChartData.mockReturnValue({
        labels: ['Test'],
        datasets: [{ data: [1] }]
      });
      
      await chartManager.initializeCharts();
    });

    test('should destroy all charts', () => {
      chartManager.destroyCharts();

      Object.values(chartManager.charts).forEach(chart => {
        expect(chart.destroy).toHaveBeenCalled();
      });

      expect(chartManager.charts).toEqual({});
    });

    test('should handle destroy errors gracefully', () => {
      const errorChart = {
        ...mockChartInstance,
        destroy: jest.fn(() => { throw new Error('Destroy failed'); })
      };
      chartManager.charts.scoreDistribution = errorChart;

      expect(() => chartManager.destroyCharts()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('resizeCharts', () => {
    beforeEach(async () => {
      mockDataService.getChartData.mockReturnValue({
        labels: ['Test'],
        datasets: [{ data: [1] }]
      });
      
      await chartManager.initializeCharts();
    });

    test('should resize all charts', () => {
      chartManager.resizeCharts();

      Object.values(chartManager.charts).forEach(chart => {
        expect(chart.resize).toHaveBeenCalled();
      });
    });
  });

  describe('getChartInstance', () => {
    test('should return chart instance by name', async () => {
      mockDataService.getChartData.mockReturnValue({
        labels: ['Test'],
        datasets: [{ data: [1] }]
      });
      
      await chartManager.initializeCharts();
      
      const chart = chartManager.getChartInstance('scoreDistribution');
      expect(chart).toBe(chartManager.charts.scoreDistribution);
    });

    test('should return null for non-existent chart', () => {
      const chart = chartManager.getChartInstance('nonexistent');
      expect(chart).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing data service gracefully', async () => {
      chartManager.dataService = null;
      
      await chartManager.updateCharts();
      
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle invalid chart data', () => {
      const invalidData = null;
      
      const chart = chartManager.createScoreDistributionChart('scoreDistributionChart', invalidData);
      
      expect(chart).toBeDefined();
      expect(global.Chart).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: invalidData
        })
      );
    });
  });

  describe('Chart Configuration', () => {
    test('should use correct colors from config', () => {
      const mockData = {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{ data: [30, 50, 20] }]
      };

      chartManager.createScoreDistributionChart('scoreDistributionChart', mockData);

      const chartCall = global.Chart.mock.calls[global.Chart.mock.calls.length - 1];
      const config = chartCall[1];
      
      expect(config.data.datasets[0].backgroundColor).toEqual(
        expect.arrayContaining(['#28a745', '#ffc107', '#dc3545'])
      );
    });

    test('should set responsive options correctly', () => {
      const mockData = { labels: [], datasets: [] };

      chartManager.createResponsesTimeChart('responsesTimeChart', mockData);

      const chartCall = global.Chart.mock.calls[global.Chart.mock.calls.length - 1];
      const config = chartCall[1];
      
      expect(config.options.responsive).toBe(true);
      expect(config.options.maintainAspectRatio).toBe(false);
    });
  });
});