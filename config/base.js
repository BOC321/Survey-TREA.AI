module.exports = {
  app: {
    name: 'Survey Application',
    version: '1.0.0',
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost'
  },
  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    trustProxy: process.env.TRUST_PROXY === 'true',
    sessionSecret: process.env.SESSION_SECRET || 'survey-app-secret-key-change-in-production'
  },
  email: {
    configFile: './email-config.json',
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 30000, // 30 seconds
    maxAttachmentSize: 25 * 1024 * 1024, // 25MB
    allowedDomains: process.env.ALLOWED_EMAIL_DOMAINS ? process.env.ALLOWED_EMAIL_DOMAINS.split(',') : null
  },
  pdf: {
    outputDir: './generated-pdfs',
    maxConcurrent: 3,
    timeout: 30000, // 30 seconds
    cleanupDelay: 300000, // 5 minutes
    puppeteerOptions: {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      timeout: 60000
    }
  },
  storage: {
    sharedResultsDir: './shared-results',
    logsDir: './logs',
    maxFileAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    emailWindowMs: 60 * 60 * 1000, // 1 hour
    maxEmailRequests: 10,
    pdfWindowMs: 15 * 60 * 1000, // 15 minutes
    maxPdfRequests: 20
  },
  logging: {
    level: 'info',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    datePattern: 'YYYY-MM-DD',
    enableConsole: true,
    enableFile: true
  }
};