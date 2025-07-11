// Analytics Dashboard JavaScript - Modular Version

class AnalyticsDashboard {
    constructor() {
        // Initialize modules
        this.dataService = new DataService();
        this.chartManager = new ChartManager();
        this.uiController = new UIController(this.dataService);
        this.exportService = new ExportService(this.dataService);
        
        // Configuration
        this.config = window.AnalyticsConfig || {};
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Analytics Dashboard...');
            
            // Initialize UI first
            if (!this.uiController.initializeUI()) {
                throw new Error('Failed to initialize UI - missing required elements');
            }
            
            // Setup event listeners
            this.uiController.setupEventListeners();
            
            // Show loading indicator
            this.uiController.showLoading(true);
            
            // Load data
            console.log('Attempting to load data from DataService...');
            await this.dataService.loadData();
            console.log('Data loading process completed.');
            
            // Populate UI elements
            console.log('Populating survey versions...');
            this.uiController.populateSurveyVersions();
            console.log('Survey versions populated.');
            
            // Initialize charts (async)
            console.log('Initializing charts...');
            await this.chartManager.initializeCharts();
            console.log('Charts initialized.');
            
            // Update dashboard
            console.log('Updating dashboard...');
            await this.updateDashboard();
            console.log('Dashboard updated.');
            
            // Debug: Log data after initialization
            const filteredData = this.dataService.getFilteredData();
            console.log('Dashboard initialized with data:', this.dataService.getRawData().length, 'items');
            console.log('Filtered data:', filteredData.length, 'items');
            if (filteredData.length > 0) {
                console.log('Sample data item:', filteredData[0]);
                if (filteredData[0] && filteredData[0].results) {
                    console.log('Sample results structure:', filteredData[0].results);
                }
            } else {
                console.warn('No filtered data available!');
            }
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            const errorMsg = this.config.messages?.errors?.chartInitFailed || 'Failed to initialize analytics dashboard';
            this.uiController.showError(errorMsg);
        } finally {
            this.uiController.showLoading(false);
        }
    }

    // Delegate filter application to UI controller
    async applyFilters() {
        this.uiController.applyFilters();
        await this.updateDashboard();
    }

    // Delegate filter reset to UI controller
    async resetFilters() {
        this.uiController.resetFilters();
        await this.updateDashboard();
    }

    // Refresh data
    async refreshData() {
        try {
            this.uiController.showLoading(true);
            await this.dataService.loadData();
            this.uiController.populateSurveyVersions();
            await this.updateDashboard();
            const successMsg = this.config.messages?.success?.dataRefreshed || 'Data refreshed successfully!';
            this.uiController.showSuccess(successMsg);
        } catch (error) {
            console.error('Error refreshing data:', error);
            const errorMsg = this.config.messages?.errors?.dataLoadFailed || 'Failed to refresh data';
            this.uiController.showError(errorMsg);
        } finally {
            this.uiController.showLoading(false);
        }
    }

    // Update dashboard with current data
    async updateDashboard() {
        try {
            const filteredData = this.dataService.getFilteredData();
            
            // Update metrics
            this.uiController.updateMetrics();
            
            // Update charts (async)
            await this.chartManager.updateCharts(filteredData);
            
            // Update tables
            this.uiController.updateTables();
            
            // Update geographic data
            this.uiController.updateGeographicData();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
            const errorMsg = this.config.messages?.errors?.chartUpdateFailed || 'Failed to update dashboard';
            this.uiController.showError(errorMsg);
        }
    }

    // Export methods - delegate to ExportService
    generateMailingList() {
        return this.exportService.generateMailingList();
    }

    exportEmailList() {
        return this.exportService.exportEmailList();
    }

    exportToPDF() {
        return this.exportService.exportToPDF();
    }

    exportToJSON() {
        return this.exportService.exportToJSON();
    }

    exportToCSV() {
        return this.exportService.exportToCSV();
    }

    // Table visibility methods - delegate to UI controller
    showTable(tableType) {
        this.uiController.showTable(tableType);
    }
}

// Global functions for HTML event handlers
async function applyFilters() {
    if (window.dashboard) {
        try {
            await window.dashboard.applyFilters();
        } catch (error) {
            console.error('Error applying filters:', error);
            alert('Error applying filters. Please try again.');
        }
    }
}

async function resetFilters() {
    if (window.dashboard) {
        try {
            await window.dashboard.resetFilters();
        } catch (error) {
            console.error('Error resetting filters:', error);
            alert('Error resetting filters. Please try again.');
        }
    }
}

function refreshData() {
    if (window.dashboard) {
        window.dashboard.refreshData();
    }
}

function showTable(tableType) {
    if (window.dashboard) {
        window.dashboard.showTable(tableType);
    }
}

// Initialize the dashboard on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
            }
        }).then(function() {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered:', reg))
                .catch(err => console.error('Service Worker registration failed:', err));
        });
    }

    window.dashboard = new AnalyticsDashboard();
});
function generateMailingList(type) {
    if (window.dashboard) {
        window.dashboard.generateMailingList(type);
    }
}

function exportEmailList() {
    if (window.dashboard) {
        window.dashboard.exportEmailList();
    }
}

async function exportToPDF() {
    if (window.dashboard) {
        try {
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;">Loading PDF export...</div>';
            loadingDiv.id = 'pdf-loading-indicator';
            document.body.appendChild(loadingDiv);
            
            await window.dashboard.exportToPDF();
            
            // Remove loading indicator
            const indicator = document.getElementById('pdf-loading-indicator');
            if (indicator) {
                document.body.removeChild(indicator);
            }
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error exporting to PDF. Please try again.');
            // Remove loading indicator on error
            const indicator = document.getElementById('pdf-loading-indicator');
            if (indicator) {
                document.body.removeChild(indicator);
            }
        }
    }
}

function exportToJSON() {
    if (window.dashboard) {
        window.dashboard.exportToJSON();
    }
}

function exportToCSV() {
    if (window.dashboard) {
        try {
            window.dashboard.exportToCSV();
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            alert('Error exporting to CSV. Please try again.');
        }
    }
}