const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock the server for testing
const app = require('../server');

describe('Survey API Tests', () => {
    // Test health endpoint
    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data).toHaveProperty('storage');
            expect(response.body.data).toHaveProperty('pdf');
        });
    });

    // Test email configuration validation
    describe('POST /api/configure-email', () => {
        it('should reject invalid email configuration', async () => {
            const response = await request(app)
                .post('/api/configure-email')
                .send({
                    host: '',
                    port: 'invalid',
                    user: 'invalid-email',
                    password: ''
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should accept valid email configuration', async () => {
            const response = await request(app)
                .post('/api/configure-email')
                .send({
                    host: 'smtp.gmail.com',
                    port: 587,
                    user: 'test@gmail.com',
                    password: 'testpassword'
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
    });

    // Test survey results validation
    describe('POST /api/generate-link', () => {
        it('should reject invalid survey data', async () => {
            const response = await request(app)
                .post('/api/generate-link')
                .send({
                    surveyTitle: '',
                    results: null
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
        });

        it('should generate link for valid survey data', async () => {
            const response = await request(app)
                .post('/api/generate-link')
                .send({
                    surveyTitle: 'Test Survey',
                    results: {
                        responses: [{
                            question: 'Test Question',
                            answer: 'Test Answer'
                        }],
                        score: 85,
                        completedAt: new Date().toISOString()
                    }
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.link).toBeDefined();
            expect(response.body.data.id).toBeDefined();
        });
    });

    // Test rate limiting
    describe('Rate Limiting', () => {
        it('should enforce rate limits on email endpoints', async () => {
            // Make multiple rapid requests to trigger rate limiting
            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(
                    request(app)
                        .post('/api/test-email')
                        .send({ testEmail: 'test@example.com' })
                );
            }
            
            const responses = await Promise.all(promises);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    // Test input sanitization
    describe('Input Sanitization', () => {
        it('should sanitize malicious input in survey titles', async () => {
            const maliciousTitle = '<script>alert("xss")</script>Test Survey';
            
            const response = await request(app)
                .post('/api/generate-link')
                .send({
                    surveyTitle: maliciousTitle,
                    results: {
                        responses: [{
                            question: 'Test Question',
                            answer: 'Test Answer'
                        }],
                        score: 85,
                        completedAt: new Date().toISOString()
                    }
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            // The title should be sanitized
            expect(response.body.data.link).not.toContain('<script>');
        });
    });

    // Test 404 handling
    describe('404 Handling', () => {
        it('should return 404 for non-existent API endpoints', async () => {
            const response = await request(app)
                .get('/api/non-existent-endpoint')
                .expect(404);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });
    });
});

// Cleanup after tests
afterAll(() => {
    // Clean up any test files created during testing
    const testDirs = ['./shared-results', './generated-pdfs', './logs'];
    
    testDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.startsWith('test_')) {
                    fs.unlinkSync(path.join(dir, file));
                }
            });
        }
    });
});