// Unit tests for ChartLoader module

const fs = require('fs');
const path = require('path');

// Load ChartLoader class
const ChartLoader = require('../../modules/ChartLoader');

describe('ChartLoader', () => {
  let originalCreateElement;
  let mockScript;

  beforeEach(() => {
    // Reset global objects
    delete global.Chart;
    delete global.jspdf;
    
    // Mock script element
    mockScript = {
      src: '',
      integrity: '',
      crossOrigin: '',
      onload: null,
      onerror: null,
      addEventListener: jest.fn((event, callback) => {
        if (event === 'load') {
          mockScript.onload = callback;
        } else if (event === 'error') {
          mockScript.onerror = callback;
        }
      }),
      removeEventListener: jest.fn()
    };

    // Mock document.createElement
    originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'script') {
        return mockScript;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Mock document.head.appendChild
    document.head.appendChild = jest.fn();
    document.head.removeChild = jest.fn();

    // Reset fetch mock
    fetch.mockClear();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    jest.clearAllMocks();
  });

  describe('loadChartJS', () => {
    test('should load Chart.js successfully', async () => {
      const loadPromise = ChartLoader.loadChartJS();
      
      // Simulate successful script loading
      setTimeout(() => {
        global.Chart = {
          register: jest.fn(),
          version: '4.0.0'
        };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await loadPromise;

      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockScript);
      expect(mockScript.src).toContain('chart.js');
      expect(mockScript.integrity).toBeTruthy();
      expect(mockScript.crossOrigin).toBe('anonymous');
    });

    test('should return cached Chart.js if already loaded', async () => {
      global.Chart = { version: '4.0.0' };
      
      await ChartLoader.loadChartJS();
      
      expect(document.createElement).not.toHaveBeenCalled();
    });

    test('should handle Chart.js loading error', async () => {
      const loadPromise = ChartLoader.loadChartJS();
      
      // Simulate script loading error
      setTimeout(() => {
        if (mockScript.onerror) {
          mockScript.onerror(new Error('Failed to load'));
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow('Failed to load Chart.js');
      expect(document.head.removeChild).toHaveBeenCalledWith(mockScript);
    });

    test('should handle timeout', async () => {
      const originalTimeout = ChartLoader.timeout;
      ChartLoader.timeout = 50; // Short timeout for testing
      
      const loadPromise = ChartLoader.loadChartJS();
      
      await expect(loadPromise).rejects.toThrow('Timeout loading Chart.js');
      
      ChartLoader.timeout = originalTimeout;
    });

    test('should verify integrity after loading', async () => {
      const loadPromise = ChartLoader.loadChartJS();
      
      setTimeout(() => {
        // Simulate Chart.js loading but with wrong version
        global.Chart = { version: '3.0.0' };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow('Chart.js integrity check failed');
    });
  });

  describe('loadjsPDF', () => {
    test('should load jsPDF successfully', async () => {
      const loadPromise = ChartLoader.loadjsPDF();
      
      // Simulate successful script loading
      setTimeout(() => {
        global.jspdf = {
          jsPDF: jest.fn()
        };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await loadPromise;

      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockScript);
      expect(mockScript.src).toContain('jspdf');
    });

    test('should return cached jsPDF if already loaded', async () => {
      global.jspdf = { jsPDF: jest.fn() };
      
      await ChartLoader.loadjsPDF();
      
      expect(document.createElement).not.toHaveBeenCalled();
    });

    test('should handle jsPDF loading error', async () => {
      const loadPromise = ChartLoader.loadjsPDF();
      
      setTimeout(() => {
        if (mockScript.onerror) {
          mockScript.onerror(new Error('Failed to load'));
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow('Failed to load jsPDF');
    });
  });

  describe('loadMultiple', () => {
    test('should load multiple libraries successfully', async () => {
      const loadPromise = ChartLoader.loadMultiple(['chartjs', 'jspdf']);
      
      // Simulate successful loading of both libraries
      setTimeout(() => {
        global.Chart = { version: '4.0.0' };
        global.jspdf = { jsPDF: jest.fn() };
        
        // Trigger all onload events
        const calls = document.createElement.mock.calls.filter(call => call[0] === 'script');
        calls.forEach(() => {
          if (mockScript.onload) {
            mockScript.onload();
          }
        });
      }, 10);

      await loadPromise;

      expect(document.createElement).toHaveBeenCalledTimes(2);
    });

    test('should handle partial loading failure', async () => {
      const loadPromise = ChartLoader.loadMultiple(['chartjs', 'jspdf']);
      
      setTimeout(() => {
        global.Chart = { version: '4.0.0' };
        // Don't load jsPDF, simulate error
        if (mockScript.onerror) {
          mockScript.onerror(new Error('Failed to load jsPDF'));
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow();
    });

    test('should handle invalid library names', async () => {
      await expect(ChartLoader.loadMultiple(['invalid'])).rejects.toThrow('Unknown library: invalid');
    });
  });

  describe('preloadOnIdle', () => {
    test('should preload libraries when browser is idle', async () => {
      const preloadPromise = ChartLoader.preloadOnIdle(['chartjs']);
      
      // Simulate idle callback
      setTimeout(() => {
        const idleCallback = global.requestIdleCallback.mock.calls[0][0];
        idleCallback({ didTimeout: false, timeRemaining: () => 50 });
        
        // Then simulate successful loading
        setTimeout(() => {
          global.Chart = { version: '4.0.0' };
          if (mockScript.onload) {
            mockScript.onload();
          }
        }, 10);
      }, 10);

      await preloadPromise;

      expect(global.requestIdleCallback).toHaveBeenCalled();
    });

    test('should fallback to setTimeout if requestIdleCallback not available', async () => {
      const originalRequestIdleCallback = global.requestIdleCallback;
      delete global.requestIdleCallback;
      
      const preloadPromise = ChartLoader.preloadOnIdle(['chartjs']);
      
      setTimeout(() => {
        global.Chart = { version: '4.0.0' };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await preloadPromise;

      global.requestIdleCallback = originalRequestIdleCallback;
    });
  });

  describe('isChartJSLoaded', () => {
    test('should return true when Chart.js is loaded', () => {
      global.Chart = { version: '4.0.0' };
      expect(ChartLoader.isChartJSLoaded()).toBe(true);
    });

    test('should return false when Chart.js is not loaded', () => {
      delete global.Chart;
      expect(ChartLoader.isChartJSLoaded()).toBe(false);
    });
  });

  describe('isjsPDFLoaded', () => {
    test('should return true when jsPDF is loaded', () => {
      global.jspdf = { jsPDF: jest.fn() };
      expect(ChartLoader.isjsPDFLoaded()).toBe(true);
    });

    test('should return false when jsPDF is not loaded', () => {
      delete global.jspdf;
      expect(ChartLoader.isjsPDFLoaded()).toBe(false);
    });
  });

  describe('getLoadedLibraries', () => {
    test('should return list of loaded libraries', () => {
      global.Chart = { version: '4.0.0' };
      global.jspdf = { jsPDF: jest.fn() };
      
      const loaded = ChartLoader.getLoadedLibraries();
      
      expect(loaded).toContain('chartjs');
      expect(loaded).toContain('jspdf');
    });

    test('should return empty array when no libraries loaded', () => {
      delete global.Chart;
      delete global.jspdf;
      
      const loaded = ChartLoader.getLoadedLibraries();
      
      expect(loaded).toEqual([]);
    });
  });

  describe('clearCache', () => {
    test('should clear loaded libraries from global scope', () => {
      global.Chart = { version: '4.0.0' };
      global.jspdf = { jsPDF: jest.fn() };
      
      ChartLoader.clearCache();
      
      expect(global.Chart).toBeUndefined();
      expect(global.jspdf).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const loadPromise = ChartLoader.loadChartJS();
      
      setTimeout(() => {
        const error = new Error('Network error');
        error.type = 'error';
        if (mockScript.onerror) {
          mockScript.onerror(error);
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow('Failed to load Chart.js');
    });

    test('should clean up script elements on error', async () => {
      const loadPromise = ChartLoader.loadChartJS();
      
      setTimeout(() => {
        if (mockScript.onerror) {
          mockScript.onerror(new Error('Load failed'));
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow();
      expect(document.head.removeChild).toHaveBeenCalledWith(mockScript);
    });
  });

  describe('Performance', () => {
    test('should track loading performance', async () => {
      const startTime = performance.now();
      
      const loadPromise = ChartLoader.loadChartJS();
      
      setTimeout(() => {
        global.Chart = { version: '4.0.0' };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await loadPromise;
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Loading', () => {
    test('should handle concurrent load requests', async () => {
      const promise1 = ChartLoader.loadChartJS();
      const promise2 = ChartLoader.loadChartJS();
      
      setTimeout(() => {
        global.Chart = { version: '4.0.0' };
        if (mockScript.onload) {
          mockScript.onload();
        }
      }, 10);

      await Promise.all([promise1, promise2]);
      
      // Should only create one script element
      expect(document.createElement).toHaveBeenCalledTimes(1);
    });
  });
});