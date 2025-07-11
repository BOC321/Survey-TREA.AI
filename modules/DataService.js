// Data Service Module

async function fetchWithRetry(url, options, retries = 3, backoff = 300) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'No error details available' }));
                const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }
            return response.json(); // Correctly parse JSON here
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, backoff * (i + 1)));
            } else {
                throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${error.message}`);
            }
        }
    }
}

class DataService {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.config = window.AnalyticsConfig || {};
    }

    async loadData() {
        console.log('DataService: loadData started.');
        this.isLoading = true;
        try {
            const [responses, emails] = await Promise.all([
                this.fetchResponsesData(),
                this.fetchEmailData()
            ]);
            console.log('DataService: Fetched responses and emails.');
            this.rawData = this.combineData(responses, emails);
            console.log('DataService: Combined data. Total items:', this.rawData.length);
            this.applyFilters({ dateRange: 'all', scoreRange: 'all', surveyVersion: 'all' }); // Initial filter application
            console.log('DataService: Initial filters applied.');
        } catch (error) {
            console.error('DataService: Error loading data:', error);
            this.rawData = [];
            this.filteredData = [];
            throw error; // Re-throw to be caught by the caller
        } finally {
            this.isLoading = false;
            console.log('DataService: loadData finished.');
        }
    }

    async fetchResponsesData() {
        console.log('DataService: Fetching responses data...');
        const data = await fetchWithRetry('/analytics/responses');
        console.log('DataService: Received responses data:', (data || []).length, 'items');
        return data || [];
    }

    async fetchEmailData() {
        console.log('DataService: Fetching email data...');
        const data = await fetchWithRetry('/analytics/emails');
        console.log('DataService: Received email data:', (data || []).length, 'items');
        return data || [];
    }

    combineData(responsesData, emailData) {
        // Combine response data with email data
        const combined = [];
        
        // Ensure data is iterable
        const validResponses = Array.isArray(responsesData) ? responsesData : [];
        const validEmails = Array.isArray(emailData) ? emailData : [];

        // Process shared results
        validResponses.forEach(response => {
            const emailRecord = validEmails.find(email => 
                email.surveyTitle === response.surveyTitle &&
                Math.abs(new Date(email.timestamp) - new Date(response.timestamp)) < (this.config.ui?.timingThresholds?.dataMatchWindow || 60000) // Within configured time window
            );
            
            combined.push({
                id: response.id,
                timestamp: response.timestamp,
                surveyTitle: response.surveyTitle || this.config.dataProcessing?.unknownSurveyTitle || 'Unknown Survey',
                results: response.results,
                email: emailRecord ? emailRecord.recipientEmail : null,
                ip: response.ip || emailRecord?.ip,
                userAgent: response.userAgent || emailRecord?.userAgent,
                method: response.method || emailRecord?.method,
                hasEmailRequest: !!emailRecord
            });
        });

        // Add email-only records (responses that were only emailed)
        validEmails.forEach(email => {
            const exists = combined.find(item => 
                item.email === email.recipientEmail &&
                item.surveyTitle === email.surveyTitle &&
                Math.abs(new Date(item.timestamp) - new Date(email.timestamp)) < (this.config.ui?.timingThresholds?.dataMatchWindow || 60000)
            );
            
            if (!exists) {
                combined.push({
                    id: email.id,
                    timestamp: email.timestamp,
                    surveyTitle: email.surveyTitle,
                    results: email.results,
                    email: email.recipientEmail,
                    ip: email.ip,
                    userAgent: email.userAgent,
                    method: email.method,
                    hasEmailRequest: true
                });
            }
        });

        return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    applyFilters(filters = { dateRange: 'all', scoreRange: 'all', surveyVersion: 'all' }) {
        this.filteredData = this.rawData.filter(item => {
            // Date filtering
            const itemDate = new Date(item.timestamp);
            const now = new Date();
            
            if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
                const start = new Date(filters.startDate);
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999); // Include full end date
                if (itemDate < start || itemDate > end) return false;
            } else if (filters.dateRange !== 'all') {
                const daysAgo = parseInt(filters.dateRange);
                const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                if (itemDate < cutoffDate) return false;
            }

            // Score filtering
            if (filters.scoreRange !== 'all' && item.results?.percentage !== undefined) {
                const percentage = item.results.percentage;
                const thresholds = this.config.performance?.scoreThresholds || { high: 80, medium: 50 };
                if (filters.scoreRange === 'high' && percentage < thresholds.high) return false;
                if (filters.scoreRange === 'medium' && (percentage < thresholds.medium || percentage >= thresholds.high)) return false;
                if (filters.scoreRange === 'low' && percentage >= thresholds.medium) return false;
            }

            // Survey version filtering
            if (filters.surveyVersion !== 'all' && item.surveyTitle !== filters.surveyVersion) {
                return false;
            }

            return true;
        });

        return this.filteredData;
    }

    getFilteredData() {
        return this.filteredData;
    }

    getRawData() {
        return this.rawData;
    }

    getSurveyVersions() {
        const unknownTitle = this.config.dataProcessing?.unknownSurveyTitle || 'Unknown Survey';
        return [...new Set(this.rawData.map(item => item.surveyTitle))]
            .filter(title => title && title !== unknownTitle);
    }

    getMetrics() {
        const totalResponses = this.filteredData.length;
        const emailRequests = this.filteredData.filter(item => item.hasEmailRequest).length;
        const emailRequestPercentage = totalResponses > 0 ? ((emailRequests / totalResponses) * 100).toFixed(1) : 0;
        
        const validScores = this.filteredData.filter(item => item.results?.percentage !== undefined);
        const averageScore = validScores.length > 0 
            ? (validScores.reduce((sum, item) => sum + item.results.percentage, 0) / validScores.length).toFixed(1)
            : 0;
        
        // Completion rate (assuming all filtered data represents completed surveys)
        const completionRate = this.config.dataProcessing?.completionRateDefault || '100'; // Since we only store completed surveys

        return {
            totalResponses,
            completionRate,
            emailRequestPercentage,
            averageScore
        };
    }

    getLocationFromIP(ip) {
        // Mock implementation - replace with actual IP geolocation service
        const localIdentifiers = this.config.dataProcessing?.localNetworkIdentifiers || ['192.168.', '10.', '127.'];
        const localLabel = this.config.dataProcessing?.localNetworkLabel || 'Local Network';
        
        if (localIdentifiers.some(identifier => ip.startsWith(identifier))) {
            return localLabel;
        }
        
        // Mock some locations based on IP patterns
        const mockLocations = this.config.dataProcessing?.mockLocations || 
            ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France'];
        return mockLocations[Math.floor(Math.random() * mockLocations.length)];
    }

    getGeographicData() {
        const locations = {};
        
        this.filteredData.forEach(item => {
            if (item.ip) {
                const location = this.getLocationFromIP(item.ip);
                locations[location] = (locations[location] || 0) + 1;
            }
        });

        return Object.entries(locations)
            .sort(([,a], [,b]) => b - a)
            .map(([location, count]) => ({ location, count }));
    }

    getCategoryStats() {
        const categoryStats = {};
        
        this.filteredData.forEach(item => {
            if (item.results?.categoryScores) {
                Object.entries(item.results.categoryScores).forEach(([category, scoreData]) => {
                    if (!categoryStats[category]) {
                        categoryStats[category] = {
                            totalScore: 0,
                            count: 0,
                            scores: []
                        };
                    }
                    // Extract the actual score value from the score object
                    const scoreValue = typeof scoreData === 'object' ? scoreData.score : scoreData;
                    categoryStats[category].totalScore += scoreValue;
                    categoryStats[category].count++;
                    categoryStats[category].scores.push(scoreValue);
                });
            }
        });

        return Object.entries(categoryStats).map(([category, stats]) => {
            const avgScore = (stats.totalScore / stats.count).toFixed(1);
            const performance = avgScore >= 80 ? 'high' : avgScore >= 50 ? 'medium' : 'low';
            const performanceText = avgScore >= 80 ? 'High' : avgScore >= 50 ? 'Medium' : 'Low';
            
            // Simple correlation calculation (mock)
            const correlation = this.calculateCategoryCorrelation(category, stats.scores);

            return {
                category,
                avgScore,
                count: stats.count,
                performance,
                performanceText,
                correlation
            };
        });
    }

    calculateCategoryCorrelation(category, scores) {
        // Simplified correlation calculation
        if (scores.length < 2) return 'N/A';
        
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
        const correlation = variance < 100 ? 'High' : variance < 400 ? 'Medium' : 'Low';
        
        return correlation;
    }

    getEmailData() {
        return this.filteredData.filter(item => item.email);
    }

    getResponsesTableData(limit = 50) {
        return this.filteredData.slice(0, limit).map(item => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            surveyTitle: item.surveyTitle,
            score: item.results?.totalScore || 'N/A',
            percentage: item.results?.percentage ? `${item.results.percentage.toFixed(1)}%` : 'N/A',
            emailSent: item.hasEmailRequest ? '✅' : '❌',
            location: item.ip ? this.getLocationFromIP(item.ip) : 'Unknown'
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
} else {
    window.DataService = DataService;
}