// Test setup file for Jest

// Mock Chart.js
global.Chart = {
  register: jest.fn(),
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
    data: { datasets: [] },
    options: {}
  })),
  version: '4.0.0'
};

// Mock jsPDF
global.jspdf = {
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
    addPage: jest.fn(),
    setTextColor: jest.fn()
  }))
};

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}));

// Mock window.requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
});

global.cancelIdleCallback = jest.fn();

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map()
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn((content, options) => ({ content, options }));

// Mock File
global.File = jest.fn((bits, name, options) => ({ bits, name, options }));

// Mock MessageChannel
global.MessageChannel = jest.fn(() => ({
  port1: { onmessage: null, postMessage: jest.fn() },
  port2: { onmessage: null, postMessage: jest.fn() }
}));

// Mock navigator
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({
      scope: 'http://localhost:3000/',
      addEventListener: jest.fn()
    })),
    controller: {
      postMessage: jest.fn()
    }
  },
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock alert and confirm
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// Setup JSDOM environment
require('jest-canvas-mock');

// Mock global objects that might not be available in JSDOM
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Add canvas element to document for chart tests
if (typeof document !== 'undefined') {
  const canvas = document.createElement('canvas');
  canvas.id = 'test-canvas';
  canvas.width = 400;
  canvas.height = 300;
  document.body.appendChild(canvas);
}

// Mock window object and browser globals
global.window = {
  AnalyticsConfig: {
    endpoints: {
      responses: '/api/analytics/responses',
      emails: '/api/analytics/emails'
    },
    colors: {
      primary: '#add8e6'
    }
  },
  Chart: jest.fn(),
  jsPDF: jest.fn(),
  requestIdleCallback: jest.fn(cb => setTimeout(cb, 0)),
  document: {
    createElement: jest.fn(() => ({
      src: '',
      crossOrigin: '',
      integrity: '',
      onload: null,
      onerror: null,
      dataset: {},
      addEventListener: jest.fn()
    })),
    head: {
      appendChild: jest.fn()
    },
    querySelector: jest.fn()
  }
};

// Mock analytics configuration
global.AnalyticsConfig = global.window.AnalyticsConfig;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '<canvas id="test-chart" width="400" height="200"></canvas>';
});

console.log('Test setup completed successfully');