// UI Controller Module

class UIController {
    constructor(dataService) {
        this.dataService = dataService;
        this.config = window.AnalyticsConfig || {};
        this.securityValidator = new SecurityValidator();
        this.currentFilters = {
            dateRange: 'all',
            scoreRange: 'all',
            surveyVersion: 'all',
            startDate: null,
            endDate: null
        };
    }

    setupEventListeners() {
        // Date range change handler
        document.getElementById('date-range').addEventListener('change', (e) => {
            const customRange = document.getElementById('custom-date-range');
            if (e.target.value === 'custom') {
                customRange.style.display = 'grid';
            } else {
                customRange.style.display = 'none';
            }
        });

        // Auto-apply filters when changed
        ['date-range', 'score-range', 'survey-version'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // Custom date inputs
        ['start-date', 'end-date'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                if (document.getElementById('date-range').value === 'custom') {
                    this.applyFilters();
                }
            });
        });
    }

    populateSurveyVersions() {
        const versions = this.dataService.getSurveyVersions();
        
        const select = document.getElementById('survey-version');
        // Clear existing options except "All Versions"
        select.innerHTML = '<option value="all">All Versions</option>';
        
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            select.appendChild(option);
        });
    }

    applyFilters() {
        const dateRange = document.getElementById('date-range').value;
        const scoreRange = document.getElementById('score-range').value;
        const surveyVersion = document.getElementById('survey-version').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        // Validate filters before applying
        const filterValidation = this.securityValidator.validateFilters({
            scoreRange: scoreRange,
            surveyVersion: surveyVersion
        });
        
        if (!filterValidation.isValid) {
            this.showError('Invalid filter values: ' + filterValidation.errors.join(', '));
            return;
        }

        // Handle custom date range with validation
        if (dateRange === 'custom') {
            const startDateInput = document.getElementById('start-date');
            const endDateInput = document.getElementById('end-date');
            
            if (!startDate || !endDate) {
                this.showError('Please select both start and end dates for custom range');
                return;
            }
            
            // Run client-side validation first
            if (window.validateDateInput && (!window.validateDateInput(startDateInput) || !window.validateDateInput(endDateInput))) {
                this.showError('Please fix the date validation errors before applying filters.');
                return;
            }
            
            const dateValidation = this.securityValidator.validateDateRange(startDate, endDate);
            
            if (!dateValidation.isValid) {
                this.showError('Invalid date range: ' + dateValidation.errors.join(', '));
                return;
            }
        }

        this.currentFilters = {
            dateRange,
            scoreRange: filterValidation.sanitized.scoreRange || scoreRange,
            surveyVersion: filterValidation.sanitized.surveyVersion || surveyVersion,
            startDate: dateRange === 'custom' && startDate ? startDate : null,
            endDate: dateRange === 'custom' && endDate ? endDate : null
        };

        // Apply filters to data service
        this.dataService.applyFilters(this.currentFilters);
        
        return this.currentFilters;
    }

    resetFilters() {
        document.getElementById('date-range').value = 'all';
        document.getElementById('score-range').value = 'all';
        document.getElementById('survey-version').value = 'all';
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        document.getElementById('custom-date-range').style.display = 'none';
        
        this.applyFilters();
    }

    updateMetrics() {
        const metrics = this.dataService.getMetrics();
        
        document.getElementById('total-responses').textContent = metrics.totalResponses.toLocaleString();
        document.getElementById('completion-rate').textContent = `${metrics.completionRate}%`;
        document.getElementById('email-requests').textContent = `${metrics.emailRequestPercentage}%`;
        document.getElementById('average-score').textContent = `${metrics.averageScore}%`;
    }

    updateGeographicData() {
        const geographicData = this.dataService.getGeographicData();
        const container = document.getElementById('geographic-data');
        container.innerHTML = '';

        if (geographicData.length === 0) {
            container.innerHTML = '<p>No geographic data available</p>';
            return;
        }

        geographicData.forEach(({ location, count }) => {
            const item = document.createElement('div');
            item.className = 'geographic-item';
            // Sanitize geographic data to prevent XSS
            const sanitizedLocation = this.securityValidator.sanitizeText(location);
            const sanitizedCount = this.securityValidator.sanitizeText(count);
            item.innerHTML = `
                <span class="location-name">${sanitizedLocation}</span>
                <span class="location-count">${sanitizedCount}</span>
            `;
            container.appendChild(item);
        });
    }

    updateTables() {
        this.updateResponsesTable();
        this.updateEmailsTable();
        this.updateCategoriesTable();
    }

    updateResponsesTable() {
        const tbody = document.querySelector('#responses-data-table tbody');
        if (!tbody) {
            console.warn('Responses table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        const limit = this.config.ui?.exportLimits?.responsesTableLimit || 50;
        const tableData = this.dataService.getResponsesTableData(limit);

        tableData.forEach(rowData => {
            const row = document.createElement('tr');
            // Use safe HTML rendering to prevent XSS
            row.innerHTML = `
                <td>${this.securityValidator.sanitizeText(rowData.date)}</td>
                <td>${this.securityValidator.sanitizeText(rowData.surveyTitle)}</td>
                <td>${this.securityValidator.sanitizeText(rowData.score)}</td>
                <td>${this.securityValidator.sanitizeText(rowData.percentage)}</td>
                <td>${this.securityValidator.sanitizeText(rowData.emailSent)}</td>
                <td>${this.securityValidator.sanitizeText(rowData.location)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateEmailsTable() {
        const tbody = document.querySelector('#emails-data-table tbody');
        if (!tbody) {
            console.warn('Emails table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        const emailData = this.dataService.getEmailData();
        
        emailData.forEach(item => {
            const row = document.createElement('tr');
            const date = new Date(item.timestamp).toLocaleDateString();
            const score = item.results?.percentage ? `${item.results.percentage.toFixed(1)}%` : 'N/A';
            
            // Sanitize all dynamic content to prevent XSS
            const sanitizedEmail = this.securityValidator.sanitizeText(item.email);
            const sanitizedDate = this.securityValidator.sanitizeText(date);
            const sanitizedScore = this.securityValidator.sanitizeText(score);
            const sanitizedSurveyTitle = this.securityValidator.sanitizeText(item.surveyTitle);
            const sanitizedScoreValue = this.securityValidator.sanitizeText(item.results?.percentage || 0);

            row.innerHTML = `
                <td>${sanitizedEmail}</td>
                <td>${sanitizedDate}</td>
                <td>${sanitizedScore}</td>
                <td>${sanitizedSurveyTitle}</td>
                <td><input type="checkbox" class="email-select" data-email="${sanitizedEmail}" data-score="${sanitizedScoreValue}"></td>
            `;
            tbody.appendChild(row);
        });
    }

    updateCategoriesTable() {
        const tbody = document.querySelector('#categories-data-table tbody');
        if (!tbody) {
            console.warn('Categories table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        const categoryStats = this.dataService.getCategoryStats();

        categoryStats.forEach(stat => {
            const row = document.createElement('tr');
            // Sanitize category statistics to prevent XSS
            row.innerHTML = `
                <td>${this.securityValidator.sanitizeText(stat.category)}</td>
                <td>${this.securityValidator.sanitizeText(stat.avgScore)}%</td>
                <td>${this.securityValidator.sanitizeText(stat.count)}</td>
                <td><span class="performance-indicator performance-${this.securityValidator.sanitizeText(stat.performance)}">${this.securityValidator.sanitizeText(stat.performanceText)}</span></td>
                <td>${this.securityValidator.sanitizeText(stat.correlation)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    showTable(tableType) {
        // Hide all tables
        document.querySelectorAll('.data-table').forEach(table => {
            table.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected table and activate tab
        const targetTable = document.getElementById(`${tableType}-table`);
        if (targetTable) {
            targetTable.classList.add('active');
        }
        
        // Find and activate the corresponding tab button
        const activeBtn = document.querySelector(`[onclick="showTable('${tableType}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        // Create a more sophisticated error display
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${message}</span>
                    <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
                </div>
            `;
            errorContainer.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorContainer) {
                    errorContainer.style.display = 'none';
                }
            }, 5000);
        } else {
            // Fallback to alert if error container doesn't exist
            alert(`Error: ${message}`);
        }
    }

    showSuccess(message) {
        const successContainer = document.getElementById('success-container');
        if (successContainer) {
            successContainer.innerHTML = `
                <div class="success-message">
                    <span class="success-icon">✅</span>
                    <span class="success-text">${message}</span>
                    <button class="success-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
                </div>
            `;
            successContainer.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (successContainer) {
                    successContainer.style.display = 'none';
                }
            }, 3000);
        } else {
            // Fallback to alert if success container doesn't exist
            alert(message);
        }
    }

    updateDashboard() {
        this.updateMetrics();
        this.updateTables();
        this.updateGeographicData();
    }

    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    // Utility method to check if required DOM elements exist
    validateRequiredElements() {
        const requiredElements = [
            'date-range',
            'score-range', 
            'survey-version',
            'start-date',
            'end-date',
            'custom-date-range',
            'total-responses',
            'completion-rate',
            'email-requests',
            'average-score',
            'loading-indicator'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('Missing required DOM elements:', missingElements);
            return false;
        }
        
        return true;
    }

    // Method to initialize UI state
    initializeUI() {
        // Set default values
        this.resetFilters();
        
        // Hide loading indicator
        this.showLoading(false);
        
        // Show default table (responses)
        this.showTable('responses');
        
        // Validate required elements
        return this.validateRequiredElements();
    }

    // Method to handle responsive design adjustments
    handleResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        const dashboardContainer = document.querySelector('.dashboard-container');
        
        if (dashboardContainer) {
            if (isMobile) {
                dashboardContainer.classList.add('mobile-layout');
            } else {
                dashboardContainer.classList.remove('mobile-layout');
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
} else {
    window.UIController = UIController;
}