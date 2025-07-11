// Chart Management Module

class ChartManager {
    constructor() {
        this.charts = {};
        this.config = window.AnalyticsConfig || {};
        this.chartLoader = new ChartLoader();
        this.isInitialized = false;
    }

    async initializeCharts() {
        console.log('Initializing charts with lazy loading...');
        
        try {
            // Dynamically load Chart.js
            console.log('Loading Chart.js from CDN...');
            await this.chartLoader.loadChartJS();
            console.log('✅ Chart.js loaded successfully');
            
            // Verify Chart.js is available
            if (typeof window.Chart === 'undefined') {
                throw new Error('Chart.js loaded but not available globally');
            }
            
            // Proceed with chart initialization
            this._createCharts();
            this.isInitialized = true;
            console.log('✅ Charts initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize charts:', error);
            
            // Show user-friendly error message
            const errorContainer = document.querySelector('.charts-section');
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #dc3545; margin-bottom: 16px;">📊 Chart Loading Error</h3>
                        <p style="color: #6c757d; margin-bottom: 16px;">Unable to load Chart.js library. This might be due to:</p>
                        <ul style="text-align: left; display: inline-block; color: #6c757d;">
                            <li>Network connectivity issues</li>
                            <li>CDN service temporarily unavailable</li>
                            <li>Browser security settings blocking external scripts</li>
                        </ul>
                        <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 16px;">🔄 Retry</button>
                    </div>
                `;
            }
            
            throw new Error('Chart.js library failed to load. Please check your internet connection and try again.');
        }
    }

    _createCharts() {
        console.log('Creating chart instances...');
        
        // Get canvas elements and check if they exist
        const scoreCanvas = document.getElementById('scoreDistributionChart');
        const timeCanvas = document.getElementById('responsesTimeChart');
        const categoryCanvas = document.getElementById('categoryPerformanceChart');
        
        if (!scoreCanvas || !timeCanvas || !categoryCanvas) {
            console.error('One or more chart canvas elements not found!');
            console.error('Score canvas:', scoreCanvas);
            console.error('Time canvas:', timeCanvas);
            console.error('Category canvas:', categoryCanvas);
            return;
        }
        
        console.log('Canvas elements found successfully');
        
        try {
            // Initialize Chart.js charts
            this.charts.scoreDistribution = new Chart(
                scoreCanvas,
                {
                    type: 'doughnut',
                    data: { labels: [], datasets: [] },
                    options: {
                        ...this.config.charts?.defaultOptions,
                        ...this.config.charts?.scoreDistribution?.options,
                        layout: {
                            padding: this.config.chartStyling?.padding || 10
                        }
                    }
                }
            );
            console.log('Score distribution chart initialized');

            this.charts.responsesTime = new Chart(
                timeCanvas,
                {
                    type: 'line',
                    data: { labels: [], datasets: [] },
                    options: {
                        ...this.config.charts?.defaultOptions,
                        ...this.config.charts?.responsesTime?.options,
                        layout: {
                            padding: this.config.chartStyling?.padding || 10
                        }
                    }
                }
            );
            console.log('Responses time chart initialized');

            this.charts.categoryPerformance = new Chart(
                categoryCanvas,
                {
                    type: 'radar',
                    data: { labels: [], datasets: [] },
                    options: {
                        ...this.config.charts?.defaultOptions,
                        ...this.config.charts?.categoryPerformance?.options,
                        layout: {
                            padding: this.config.chartStyling?.padding || 10
                        }
                    }
                }
            );
            console.log('Category performance chart initialized');
            
        } catch (error) {
            console.error('Error initializing charts:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
    }

    async updateCharts(filteredData) {
        console.log('Updating charts with filtered data:', filteredData.length, 'items');
        
        // Ensure charts are initialized before updating
        if (!this.isInitialized) {
            console.log('Charts not initialized yet, initializing now...');
            await this.initializeCharts();
        }
        
        if (filteredData.length > 0) {
            console.log('Sample data item:', filteredData[0]);
            console.log('Sample data results:', filteredData[0]?.results);
            console.log('Available chart objects:', Object.keys(this.charts));
        } else {
            console.warn('No filtered data available for charts!');
        }
        
        this.updateScoreDistributionChart(filteredData);
        this.updateResponsesTimeChart(filteredData);
        this.updateCategoryPerformanceChart(filteredData);
    }

    updateScoreDistributionChart(filteredData) {
        console.log('Updating score distribution chart...');
        
        if (!this.charts.scoreDistribution) {
            console.error('Score distribution chart not initialized!');
            return;
        }
        
        if (!filteredData || filteredData.length === 0) {
            console.log('No filtered data available for score distribution chart');
            // Show empty chart with placeholder
            this.charts.scoreDistribution.data = {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: [this.config.ui?.placeholderColors?.noData || '#E0E0E0'],
                    borderColor: [this.config.ui?.placeholderColors?.noDataBorder || '#CCCCCC'],
                    borderWidth: this.config.chartStyling?.borderWidth || 1
                }]
            };
            this.charts.scoreDistribution.update();
            return;
        }
        
        const scoreRangeLabels = Object.keys(this.config.colors?.scoreRanges || {
            '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0, '100%+': 0
        });
        const scoreRanges = {};
        scoreRangeLabels.forEach(label => scoreRanges[label] = 0);

        const thresholds = this.config.performance?.scoreRangeThresholds || {
            range1: 20, range2: 40, range3: 60, range4: 80, range5: 100
        };

        filteredData.forEach(item => {
            if (item.results?.percentage !== undefined) {
                const percentage = item.results.percentage;
                console.log('Processing percentage:', percentage, 'for item:', item.id);
                if (percentage <= thresholds.range1) scoreRanges['0-20%']++;
                else if (percentage <= thresholds.range2) scoreRanges['21-40%']++;
                else if (percentage <= thresholds.range3) scoreRanges['41-60%']++;
                else if (percentage <= thresholds.range4) scoreRanges['61-80%']++;
                else if (percentage <= thresholds.range5) scoreRanges['81-100%']++;
                else scoreRanges['100%+']++; // Handle scores over 100%
            }
        });
        
        console.log('Score ranges data:', scoreRanges);

        const backgroundColors = Object.values(this.config.colors?.scoreRanges || {
            '0-20%': '#ff6b6b', '21-40%': '#ffa726', '41-60%': '#ffee58', 
            '61-80%': '#66bb6a', '81-100%': '#42a5f5', '100%+': '#9c27b0'
        });
        const borderColors = Object.values(this.config.colors?.scoreRangesBorder || {
            '0-20%': '#e53e3e', '21-40%': '#f57c00', '41-60%': '#fbc02d',
            '61-80%': '#388e3c', '81-100%': '#1976d2', '100%+': '#7b1fa2'
        });

        this.charts.scoreDistribution.data = {
            labels: Object.keys(scoreRanges),
            datasets: [{
                data: Object.values(scoreRanges),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: this.config.chartStyling?.borderWidth || 1
            }]
        };
        
        try {
            this.charts.scoreDistribution.update();
            console.log('Score distribution chart updated successfully');
        } catch (error) {
            console.error('Error updating score distribution chart:', error);
        }
    }

    updateResponsesTimeChart(filteredData) {
        console.log('Updating responses time chart...');
        
        if (!this.charts.responsesTime) {
            console.error('Responses time chart not initialized!');
            return;
        }
        
        // Group responses by date
        const dateGroups = {};
        filteredData.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            dateGroups[date] = (dateGroups[date] || 0) + 1;
        });

        const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));
        const counts = sortedDates.map(date => dateGroups[date]);
        
        console.log('Date groups data:', dateGroups);
        console.log('Sorted dates:', sortedDates);
        console.log('Counts:', counts);

        this.charts.responsesTime.data = {
            labels: sortedDates,
            datasets: [{
                data: counts,
                borderColor: this.config.colors?.primary || '#add8e6',
                backgroundColor: `rgba(173, 216, 230, ${this.config.chartStyling?.fillOpacity || 0.1})`,
                fill: true,
                tension: this.config.chartStyling?.tension || 0.4
            }]
        };
        
        try {
            this.charts.responsesTime.update();
            console.log('Responses time chart updated successfully');
        } catch (error) {
            console.error('Error updating responses time chart:', error);
        }
    }

    updateCategoryPerformanceChart(filteredData) {
        console.log('Updating category performance chart...');
        
        if (!this.charts.categoryPerformance) {
            console.error('Category performance chart not initialized!');
            return;
        }
        
        // Calculate average scores by category
        const categoryScores = {};
        const categoryCounts = {};

        filteredData.forEach(item => {
            if (item.results?.categoryScores) {
                console.log('Processing category scores for item:', item.id, item.results.categoryScores);
                Object.entries(item.results.categoryScores).forEach(([category, scoreData]) => {
                    if (!categoryScores[category]) {
                        categoryScores[category] = 0;
                        categoryCounts[category] = 0;
                    }
                    // Use the percentage value directly from the scoreData
                    const percentageValue = typeof scoreData === 'object' ? scoreData.percentage : scoreData;
                    console.log(`Category ${category}: percentage = ${percentageValue}`);
                    categoryScores[category] += percentageValue;
                    categoryCounts[category]++;
                });
            }
        });

        const categories = Object.keys(categoryScores);
        const averages = categories.map(category => {
            const avg = categoryCounts[category] > 0 
                        ? (categoryScores[category] / categoryCounts[category])
                        : 0;
                    console.log(`Category ${category}: average = ${avg}`);
                    return Math.min(avg, this.config.chartStyling?.maxRadarValue || 100); // Cap at max value for radar chart display
        });
        
        console.log('Category scores:', categoryScores);
        console.log('Category counts:', categoryCounts);
        console.log('Categories:', categories);
        console.log('Averages:', averages);

        this.charts.categoryPerformance.data = {
            labels: categories,
            datasets: [{
                data: averages,
                backgroundColor: `rgba(173, 216, 230, ${this.config.chartStyling?.radarFillOpacity || 0.2})`,
                borderColor: this.config.colors?.primary || '#add8e6',
                borderWidth: this.config.chartStyling?.borderWidthThick || 2
            }]
        };
        
        try {
            this.charts.categoryPerformance.update();
            console.log('Category performance chart updated successfully');
        } catch (error) {
            console.error('Error updating category performance chart:', error);
        }
    }

    getCharts() {
        return this.charts;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
} else {
    window.ChartManager = ChartManager;
}