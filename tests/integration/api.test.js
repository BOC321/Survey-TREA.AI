// Integration tests for API endpoints

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');

// Mock dependencies
jest.mock('fs');
jest.mock('nodemailer');
jest.mock('puppeteer');

// Create test app
function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Mock config
  global.config = {
    storage: {
      sharedResultsDir: './test-results',
      emailDataFile: './test-emails.json'
    },
    email: {
      enabled: true,
      service: 'gmail',
      user: 'test@example.com',
      pass: 'testpass'
    }
  };
  
  // Load routes
  const analyticsRoutes = require('../../routes/analytics');
  const surveyRoutes = require('../../routes/survey');
  const apiRoutes = require('../../routes/api');
  
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/survey', surveyRoutes);
  app.use('/api', apiRoutes);
  
  return app;
}

// Mock data
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
        'question2': 'Good'
      },
      categories: {
        'Service Quality': 90,
        'Product Quality': 80
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
        'question2': 'Average'
      },
      categories: {
        'Service Quality': 70,
        'Product Quality': 75
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

describe('API Integration Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock file system operations
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['survey1.json', 'survey2.json']);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('survey1.json')) {
        return JSON.stringify(mockSurveyData[0]);
      } else if (filePath.includes('survey2.json')) {
        return JSON.stringify(mockSurveyData[1]);
      } else if (filePath.includes('emails')) {
        return JSON.stringify(mockEmailData);
      }
      return JSON.stringify({});
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });
  
  describe('Analytics API Endpoints', () => {
    describe('GET /api/analytics/responses', () => {
      test('should return survey responses data', async () => {
        const response = await request(app)
          .get('/api/analytics/responses')
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toMatchObject({
          id: '1',
          surveyTitle: 'Customer Satisfaction Survey'
        });
      });
      
      test('should handle date range filters', async () => {
        const response = await request(app)
          .get('/api/analytics/responses')
          .query({
            startDate: '2024-01-16',
            endDate: '2024-01-16'
          })
          .expect(200);
        
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe('2');
      });
      
      test('should handle score range filters', async () => {
        const response = await request(app)
          .get('/api/analytics/responses')
          .query({ scoreRange: 'high' })
          .expect(200);
        
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].results.percentage).toBe(85);
      });
      
      test('should handle survey title filters', async () => {
        const response = await request(app)
          .get('/api/analytics/responses')
          .query({ surveyTitle: 'Customer Satisfaction Survey' })
          .expect(200);
        
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].surveyTitle).toBe('Customer Satisfaction Survey');
      });
      
      test('should handle file system errors', async () => {
        fs.existsSync.mockReturnValue(false);
        
        const response = await request(app)
          .get('/api/analytics/responses')
          .expect(200);
        
        expect(response.body.data).toEqual([]);
      });
      
      test('should validate query parameters', async () => {
        const response = await request(app)
          .get('/api/analytics/responses')
          .query({ 
            startDate: 'invalid-date',
            scoreRange: 'invalid-range'
          })
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });
    
    describe('GET /api/analytics/emails', () => {
      test('should return email data', async () => {
        const response = await request(app)
          .get('/api/analytics/emails')
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toMatchObject({
          email: 'user1@example.com'
        });
      });
      
      test('should handle missing email file', async () => {
        fs.existsSync.mockImplementation((path) => {
          return !path.includes('emails');
        });
        
        const response = await request(app)
          .get('/api/analytics/emails')
          .expect(200);
        
        expect(response.body.data).toEqual([]);
      });
    });
    
    describe('GET /api/analytics/metrics', () => {
      test('should return calculated metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/metrics')
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          totalResponses: 2,
          averageScore: 78.5,
          highScoreCount: 1
        });
      });
    });
    
    describe('GET /api/analytics/categories', () => {
      test('should return category statistics', async () => {
        const response = await request(app)
          .get('/api/analytics/categories')
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('Service Quality');
        expect(response.body.data).toHaveProperty('Product Quality');
      });
    });
  });
  
  describe('Survey API Endpoints', () => {
    const nodemailer = require('nodemailer');
    
    beforeEach(() => {
      // Mock nodemailer
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
      };
      nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);
    });
    
    describe('POST /api/survey/send-results', () => {
      const validPayload = {
        email: 'test@example.com',
        surveyTitle: 'Test Survey',
        results: {
          score: 85,
          percentage: 85,
          answers: {
            'question1': 'Excellent'
          }
        }
      };
      
      test('should send survey results via email', async () => {
        const response = await request(app)
          .post('/api/survey/send-results')
          .send(validPayload)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('sent successfully');
      });
      
      test('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/survey/send-results')
          .send({})
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
      
      test('should validate email format', async () => {
        const invalidPayload = {
          ...validPayload,
          email: 'invalid-email'
        };
        
        const response = await request(app)
          .post('/api/survey/send-results')
          .send(invalidPayload)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.errors.email).toBeDefined();
      });
      
      test('should validate survey title length', async () => {
        const invalidPayload = {
          ...validPayload,
          surveyTitle: 'a'.repeat(201) // Too long
        };
        
        const response = await request(app)
          .post('/api/survey/send-results')
          .send(invalidPayload)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.errors.surveyTitle).toBeDefined();
      });
      
      test('should handle email sending errors', async () => {
        const mockTransporter = {
          sendMail: jest.fn().mockRejectedValue(new Error('SMTP error'))
        };
        nodemailer.createTransport.mockReturnValue(mockTransporter);
        
        const response = await request(app)
          .post('/api/survey/send-results')
          .send(validPayload)
          .expect(500);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('email');
      });
      
      test('should store survey results', async () => {
        await request(app)
          .post('/api/survey/send-results')
          .send(validPayload)
          .expect(200);
        
        expect(fs.writeFileSync).toHaveBeenCalled();
      });
      
      test('should store email recipient data', async () => {
        await request(app)
          .post('/api/survey/send-results')
          .send(validPayload)
          .expect(200);
        
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('emails'),
          expect.any(String)
        );
      });
    });
    
    describe('POST /api/survey/generate-link', () => {
      const validPayload = {
        surveyTitle: 'Test Survey',
        results: {
          score: 85,
          percentage: 85,
          answers: { 'question1': 'Excellent' }
        }
      };
      
      test('should generate shareable link', async () => {
        const response = await request(app)
          .post('/api/survey/generate-link')
          .send(validPayload)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.shareableLink).toContain('/shared/');
        expect(response.body.resultId).toBeDefined();
      });
      
      test('should validate payload structure', async () => {
        const response = await request(app)
          .post('/api/survey/generate-link')
          .send({})
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });
    
    describe('POST /api/survey/generate-pdf', () => {
      const puppeteer = require('puppeteer');
      
      beforeEach(() => {
        // Mock Puppeteer
        const mockPage = {
          setContent: jest.fn(),
          pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
          close: jest.fn()
        };
        
        const mockBrowser = {
          newPage: jest.fn().mockResolvedValue(mockPage),
          close: jest.fn()
        };
        
        puppeteer.launch = jest.fn().mockResolvedValue(mockBrowser);
      });
      
      test('should generate PDF report', async () => {
        const validPayload = {
          surveyTitle: 'Test Survey',
          results: {
            score: 85,
            percentage: 85,
            answers: { 'question1': 'Excellent' }
          }
        };
        
        const response = await request(app)
          .post('/api/survey/generate-pdf')
          .send(validPayload)
          .expect(200);
        
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('attachment');
      });
      
      test('should handle PDF generation errors', async () => {
        puppeteer.launch.mockRejectedValue(new Error('Puppeteer error'));
        
        const response = await request(app)
          .post('/api/survey/generate-pdf')
          .send({
            surveyTitle: 'Test Survey',
            results: { score: 85 }
          })
          .expect(500);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('General API Endpoints', () => {
    describe('GET /api/health', () => {
      test('should return health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);
        
        expect(response.body.status).toBe('healthy');
        expect(response.body.timestamp).toBeDefined();
      });
    });
    
    describe('Error Handling', () => {
      test('should handle 404 for unknown endpoints', async () => {
        const response = await request(app)
          .get('/api/unknown-endpoint')
          .expect(404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
      
      test('should handle malformed JSON', async () => {
        const response = await request(app)
          .post('/api/survey/send-results')
          .set('Content-Type', 'application/json')
          .send('invalid json')
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('Caching', () => {
    test('should cache analytics responses', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/analytics/responses')
        .expect(200);
      
      // Second request should use cache
      const response2 = await request(app)
        .get('/api/analytics/responses')
        .expect(200);
      
      expect(response1.body).toEqual(response2.body);
      expect(response2.headers['x-cache']).toBe('HIT');
    });
    
    test('should invalidate cache after data update', async () => {
      // Get initial data
      await request(app)
        .get('/api/analytics/responses')
        .expect(200);
      
      // Submit new survey result
      await request(app)
        .post('/api/survey/send-results')
        .send({
          email: 'new@example.com',
          surveyTitle: 'New Survey',
          results: { score: 90, percentage: 90 }
        })
        .expect(200);
      
      // Next request should not use cache
      const response = await request(app)
        .get('/api/analytics/responses')
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('MISS');
    });
  });
  
  describe('Rate Limiting', () => {
    test('should handle rate limiting for survey submissions', async () => {
      const payload = {
        email: 'test@example.com',
        surveyTitle: 'Test Survey',
        results: { score: 85 }
      };
      
      // Make multiple rapid requests
      const promises = Array(10).fill().map(() => 
        request(app)
          .post('/api/survey/send-results')
          .send(payload)
      );
      
      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});