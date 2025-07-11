// Analytics Configuration

const AnalyticsConfig = {
    // Chart colors and styling
    colors: {
        primary: '#add8e6',
        secondary: '#42a5f5',
        success: '#66bb6a',
        warning: '#ffa726',
        danger: '#ff6b6b',
        info: '#42a5f5',
        light: '#f8f9fa',
        dark: '#343a40',
        scoreRanges: {
            '0-20%': '#ff6b6b',
            '21-40%': '#ffa726', 
            '41-60%': '#ffee58',
            '61-80%': '#66bb6a',
            '81-100%': '#42a5f5',
            '100%+': '#9c27b0'
        },
        scoreRangesBorder: {
            '0-20%': '#e53e3e',
            '21-40%': '#f57c00',
            '41-60%': '#fbc02d', 
            '61-80%': '#388e3c',
            '81-100%': '#1976d2',
            '100%+': '#7b1fa2'
        }
    },

    // API endpoints
    endpoints: {
        responses: '/analytics/responses',
        emails: '/analytics/emails'
    },

    // Chart configuration
    charts: {
        defaultOptions: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10
            }
        },
        scoreDistribution: {
            type: 'doughnut',
            options: {
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        },
        responsesTime: {
            type: 'line',
            options: {
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Responses'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        },
        categoryPerformance: {
            type: 'radar',
            options: {
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Average Score (%)'
                        }
                    }
                }
            }
        }
    },

    // UI settings
    ui: {
        loadingDelay: 500, // milliseconds
        autoHideMessages: {
            success: 3000,
            error: 5000
        },
        tablePageSize: 50,
        exportLimits: {
            csv: 1000,
            pdf: 500,
            maxExportRecords: 10000,
            responsesTableLimit: 50,
            categoryStatsLimit: 1000
        },
        timingThresholds: {
            dataMatchWindow: 60000, // 1 minute in milliseconds
            chartUpdateDelay: 100
        },
        placeholderColors: {
            noData: '#E0E0E0',
            noDataBorder: '#CCCCCC'
        }
    },

    // Performance thresholds
    performance: {
        scoreThresholds: {
            high: 80,
            medium: 50,
            low: 20
        },
        correlationThresholds: {
            high: 100,
            medium: 400
        },
        scoreRangeThresholds: {
            range1: 20,  // 0-20%
            range2: 40,  // 21-40%
            range3: 60,  // 41-60%
            range4: 80,  // 61-80%
            range5: 100  // 81-100%
        }
    },

    // Date formats
    dateFormats: {
        display: 'MM/DD/YYYY',
        export: 'YYYY-MM-DD',
        api: 'ISO'
    },

    // Validation rules
    validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        minDataPoints: 1,
        maxExportRecords: 10000
    },

    // Feature flags
    features: {
        enableGeolocation: true,
        enablePDFExport: true,
        enableEmailExport: true,
        enableRealTimeUpdates: false,
        enableAdvancedFilters: true
    },

    // Error messages
    messages: {
        errors: {
            chartInitFailed: 'Failed to initialize charts. Please refresh the page.',
            dataLoadFailed: 'Failed to load analytics data. Please try again.',
            exportFailed: 'Export failed. Please try again.',
            noDataAvailable: 'No data available for the selected filters.',
            invalidDateRange: 'Please select a valid date range.',
            networkError: 'Network error. Please check your connection.',
            pdfLibraryMissing: 'jsPDF library is not available',
            noEmailsSelected: 'Please select at least one email address.',
            chartUpdateFailed: 'Failed to update chart'
        },
        success: {
            dataRefreshed: 'Data refreshed successfully!',
            exportCompleted: 'Export completed successfully!',
            filtersApplied: 'Filters applied successfully!',
            emailListGenerated: 'Email list generated successfully!'
        },
        info: {
            loadingData: 'Loading analytics data...',
            generatingReport: 'Generating report...',
            processingExport: 'Processing export...'
        }
    },

    // Chart styling constants
    chartStyling: {
        borderWidth: 1,
        borderWidthThick: 2,
        padding: 10,
        tension: 0.4,
        fillOpacity: 0.1,
        radarFillOpacity: 0.2,
        maxRadarValue: 100
    },

    // Data processing constants
    dataProcessing: {
        unknownSurveyTitle: 'Unknown Survey',
        completionRateDefault: '100', // Since we only store completed surveys
        mockLocations: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France'],
        localNetworkIdentifiers: ['192.168.', '10.', '127.'],
        localNetworkLabel: 'Local Network'
    },

    // File naming patterns
    fileNaming: {
        emailListPrefix: 'survey-email-list-',
        pdfReportPrefix: 'survey-analytics-report-',
        jsonDataPrefix: 'survey-analytics-data-',
        csvResponsesPrefix: 'survey-responses-',
        csvCategoryPrefix: 'survey-category-stats-',
        dateFormat: 'YYYY-MM-DD' // Used in filenames
    },

    // Debug settings
    debug: {
        enabled: true, // Set to false in production
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logToConsole: true,
        showPerformanceMetrics: true
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsConfig;
} else {
    window.AnalyticsConfig = AnalyticsConfig;
}