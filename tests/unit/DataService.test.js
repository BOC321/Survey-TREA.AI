// Unit tests for DataService module

const fs = require('fs');
const path = require('path');

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
        'Overall Experience': 85
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
        'Overall Experience': 72
      }
    }
  }
];

const mockEmailData = [
  {
    email: 'user1@example.com',
    timestamp: '2024-01-15T10:30:00Z',
    surveyTitle: 'Customer Satisfaction Survey',
    results: { percentage: 85 }
  },
  {
    email: 'user2@example.com',
    timestamp: '2024-01-16T14:20:00Z',
    surveyTitle: 'Product Feedback Survey',
    results: { percentage: 72 }
  }
];

// Load DataService class
let DataService;

beforeAll(() => {
  // Mock file system operations
  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  jest.spyOn(fs, 'readdirSync').mockReturnValue(['survey1.json', 'survey2.json']);
  jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
    if (filePath.includes('survey1.json')) {
      return JSON.stringify(mockSurveyData[0]);
    } else if (filePath.includes('survey2.json')) {
      return JSON.stringify(mockSurveyData[1]);
    } else if (filePath.includes('emails')) {
      return JSON.stringify(mockEmailData);
    }
    return JSON.stringify({});
  });

  // Load the DataService module
  DataService = require('../../modules/DataService');
});

describe('DataService', () => {
  let dataService;

  beforeEach(() => {
    dataService = new DataService();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(dataService.config).toBeDefined();
      expect(dataService.cache).toBeDefined();
      expect(dataService.lastFetch).toBeNull();
    });
  });

  describe('loadData', () => {
    test('should load data successfully from API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSurveyData })
      });

      await dataService.loadData();
      
      expect(fetch).toHaveBeenCalledWith('/api/analytics/responses');
      expect(dataService.surveyData).toEqual(mockSurveyData);
    });

    test('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await dataService.loadData();
      
      expect(dataService.surveyData).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    test('should use cached data when available and fresh', async () => {
      dataService.cache.responses = { data: mockSurveyData, timestamp: Date.now() };
      dataService.lastFetch = Date.now();
      
      await dataService.loadData();
      
      expect(fetch).not.toHaveBeenCalled();
      expect(dataService.surveyData).toEqual(mockSurveyData);
    });
  });

  describe('getFilteredData', () => {
    beforeEach(() => {
      dataService.surveyData = mockSurveyData;
    });

    test('should return all data when no filters applied', () => {
      const filtered = dataService.getFilteredData();
      expect(filtered).toEqual(mockSurveyData);
    });

    test('should filter by date range', () => {
      dataService.currentFilters = {
        startDate: '2024-01-16',
        endDate: '2024-01-16'
      };
      
      const filtered = dataService.getFilteredData();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    test('should filter by score range', () => {
      dataService.currentFilters = {
        scoreRange: 'high' // >= 80
      };
      
      const filtered = dataService.getFilteredData();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].results.percentage).toBe(85);
    });

    test('should filter by survey title', () => {
      dataService.currentFilters = {
        surveyTitle: 'Customer Satisfaction Survey'
      };
      
      const filtered = dataService.getFilteredData();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].surveyTitle).toBe('Customer Satisfaction Survey');
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      dataService.surveyData = mockSurveyData;
    });

    test('should calculate correct metrics', () => {
      const metrics = dataService.getMetrics();
      
      expect(metrics.totalResponses).toBe(2);
      expect(metrics.averageScore).toBe(78.5); // (85 + 72) / 2
      expect(metrics.highScoreCount).toBe(1); // >= 80
      expect(metrics.completionRate).toBe(100);
    });

    test('should handle empty data', () => {
      dataService.surveyData = [];
      const metrics = dataService.getMetrics();
      
      expect(metrics.totalResponses).toBe(0);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.highScoreCount).toBe(0);
      expect(metrics.completionRate).toBe(0);
    });
  });

  describe('getCategoryStats', () => {
    beforeEach(() => {
      dataService.surveyData = mockSurveyData;
    });

    test('should calculate category statistics', () => {
      const stats = dataService.getCategoryStats();
      
      expect(stats).toHaveProperty('Service Quality');
      expect(stats).toHaveProperty('Product Quality');
      expect(stats).toHaveProperty('Overall Experience');
      
      expect(stats['Service Quality'].average).toBe(80); // (90 + 70) / 2
      expect(stats['Product Quality'].average).toBe(77.5); // (80 + 75) / 2
    });

    test('should handle missing category data', () => {
      dataService.surveyData = [{
        results: { categories: {} }
      }];
      
      const stats = dataService.getCategoryStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe('getChartData', () => {
    beforeEach(() => {
      dataService.surveyData = mockSurveyData;
    });

    test('should generate score distribution data', () => {
      const chartData = dataService.getChartData('scoreDistribution');
      
      expect(chartData.labels).toContain('High (80-100%)');
      expect(chartData.labels).toContain('Medium (60-79%)');
      expect(chartData.datasets[0].data).toEqual([1, 1, 0]); // 1 high, 1 medium, 0 low
    });

    test('should generate time series data', () => {
      const chartData = dataService.getChartData('timeSeries');
      
      expect(chartData.labels).toHaveLength(2);
      expect(chartData.datasets[0].data).toHaveLength(2);
    });

    test('should generate category performance data', () => {
      const chartData = dataService.getChartData('categoryPerformance');
      
      expect(chartData.labels).toContain('Service Quality');
      expect(chartData.labels).toContain('Product Quality');
      expect(chartData.labels).toContain('Overall Experience');
    });
  });

  describe('applyFilters', () => {
    test('should update current filters', () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        scoreRange: 'high'
      };
      
      dataService.applyFilters(filters);
      
      expect(dataService.currentFilters).toEqual(filters);
    });

    test('should clear invalid filters', () => {
      const filters = {
        startDate: '',
        endDate: null,
        scoreRange: 'all'
      };
      
      dataService.applyFilters(filters);
      
      expect(dataService.currentFilters.startDate).toBeUndefined();
      expect(dataService.currentFilters.endDate).toBeUndefined();
      expect(dataService.currentFilters.scoreRange).toBeUndefined();
    });
  });

  describe('clearFilters', () => {
    test('should reset all filters', () => {
      dataService.currentFilters = {
        startDate: '2024-01-01',
        scoreRange: 'high'
      };
      
      dataService.clearFilters();
      
      expect(dataService.currentFilters).toEqual({});
    });
  });

  describe('refreshData', () => {
    test('should force reload data from API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSurveyData })
      });
      
      dataService.cache.responses = { data: [], timestamp: Date.now() };
      
      await dataService.refreshData();
      
      expect(fetch).toHaveBeenCalled();
      expect(dataService.surveyData).toEqual(mockSurveyData);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON data', () => {
      fs.readFileSync.mockReturnValueOnce('invalid json');
      
      expect(() => {
        dataService.loadLocalData();
      }).not.toThrow();
    });

    test('should handle missing files gracefully', () => {
      fs.existsSync.mockReturnValueOnce(false);
      
      expect(() => {
        dataService.loadLocalData();
      }).not.toThrow();
    });
  });
});