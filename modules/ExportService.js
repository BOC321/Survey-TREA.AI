// Export Service Module

class ExportService {
    constructor(dataService) {
        this.dataService = dataService;
        this.config = window.AnalyticsConfig || {};
        this.securityValidator = new SecurityValidator();
    }

    generateMailingList(type) {
        const emailData = this.dataService.getEmailData();
        let filteredEmails = [];

        switch (type) {
            case 'all':
                filteredEmails = emailData;
                break;
            case 'high':
                const highThreshold = this.config.performance?.scoreThresholds?.high || 80;
                filteredEmails = emailData.filter(item => 
                    item.results?.percentage && item.results.percentage >= highThreshold
                );
                break;
            case 'low':
                const lowThreshold = this.config.performance?.scoreThresholds?.medium || 50;
                filteredEmails = emailData.filter(item => 
                    item.results?.percentage && item.results.percentage < lowThreshold
                );
                break;
        }

        // Select checkboxes for filtered emails
        document.querySelectorAll('.email-select').forEach(checkbox => {
            const email = checkbox.dataset.email;
            const isIncluded = filteredEmails.some(item => item.email === email);
            checkbox.checked = isIncluded;
        });

        return {
            count: filteredEmails.length,
            type: type,
            emails: filteredEmails
        };
    }

    exportEmailList() {
        const selectedEmails = [];
        document.querySelectorAll('.email-select:checked').forEach(checkbox => {
            const email = checkbox.dataset.email;
            const validation = this.securityValidator.validateEmail(email);
            if (validation.isValid) {
                selectedEmails.push({
                    email: validation.sanitized,
                    score: checkbox.dataset.score
                });
            } else {
                console.warn(`Invalid email found: ${email} - ${validation.error}`);
            }
        });

        if (selectedEmails.length === 0) {
            throw new Error(this.config.messages?.errors?.noEmailsSelected || 'Please select at least one valid email address.');
        }

        // Create CSV content with sanitized data
        const csvContent = 'Email,Score\n' + 
            selectedEmails.map(item => {
                const sanitizedEmail = this.securityValidator.sanitizeText(item.email);
                const sanitizedScore = this.securityValidator.sanitizeText(item.score);
                return `${sanitizedEmail},${sanitizedScore}%`;
            }).join('\n');

        // Download CSV file
        const filename = `${this.config.fileNaming?.emailListPrefix || 'survey-email-list-'}${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');

        return selectedEmails.length;
    }

    async exportToPDF(currentFilters) {
        try {
            // Load jsPDF dynamically
            await window.ChartLoader.loadjsPDF();
            
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error(this.config.messages?.errors?.pdfLibraryMissing || 'jsPDF library failed to load');
            }
            
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('Survey Analytics Report', 20, 20);
            
            // Add generation date
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
            
            // Add metrics
            const metrics = this.dataService.getMetrics();
            doc.setFontSize(14);
            doc.text('Key Metrics:', 20, 50);
            
            doc.setFontSize(12);
            doc.text(`Total Responses: ${metrics.totalResponses.toLocaleString()}`, 30, 60);
            doc.text(`Completion Rate: ${metrics.completionRate}%`, 30, 70);
            doc.text(`Email Request Rate: ${metrics.emailRequestPercentage}%`, 30, 80);
            doc.text(`Average Score: ${metrics.averageScore}%`, 30, 90);
            
            // Add filter information
            doc.text('Applied Filters:', 20, 110);
            doc.text(`Date Range: ${currentFilters.dateRange}`, 30, 120);
            doc.text(`Score Range: ${currentFilters.scoreRange}`, 30, 130);
            doc.text(`Survey Version: ${currentFilters.surveyVersion}`, 30, 140);
            
            // Add category performance data
            const categoryStats = this.dataService.getCategoryStats();
            if (categoryStats.length > 0) {
                doc.text('Category Performance:', 20, 160);
                let yPos = 170;
                categoryStats.forEach(stat => {
                    if (yPos > 270) { // Start new page if needed
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(`${stat.category}: ${stat.avgScore}% (${stat.performanceText})`, 30, yPos);
                    yPos += 10;
                });
            }
            
            // Save the PDF
            const filename = `${this.config.fileNaming?.pdfReportPrefix || 'survey-analytics-report-'}${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            return filename;
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(this.config.messages?.errors?.exportFailed || 'Error generating PDF report. Please try again.');
        }
    }

    exportDataAsJSON() {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalRecords: this.dataService.getFilteredData().length,
                filters: this.dataService.currentFilters
            },
            metrics: this.dataService.getMetrics(),
            responses: this.dataService.getFilteredData(),
            categoryStats: this.dataService.getCategoryStats(),
            geographicData: this.dataService.getGeographicData()
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        const filename = `${this.config.fileNaming?.jsonDataPrefix || 'survey-analytics-data-'}${new Date().toISOString().split('T')[0]}.json`;
        this.downloadFile(jsonContent, filename, 'application/json');

        return exportData;
    }

    exportResponsesAsCSV() {
        const limit = this.config.ui?.exportLimits?.categoryStatsLimit || 1000;
        const responses = this.dataService.getResponsesTableData(limit); // Export up to configured limit
        
        if (responses.length === 0) {
            throw new Error(this.config.messages?.errors?.noDataAvailable || 'No data available to export');
        }

        // Create CSV header
        const headers = ['Date', 'Survey Title', 'Score', 'Percentage', 'Email Sent', 'Location'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...responses.map(row => [
                row.date,
                `"${row.surveyTitle}"`, // Wrap in quotes to handle commas
                row.score,
                row.percentage,
                row.emailSent,
                `"${row.location}"`
            ].join(','))
        ].join('\n');

        const filename = `${this.config.fileNaming?.csvResponsesPrefix || 'survey-responses-'}${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');

        return responses.length;
    }

    exportCategoryStatsAsCSV() {
        const categoryStats = this.dataService.getCategoryStats();
        
        if (categoryStats.length === 0) {
            throw new Error('No category data available to export');
        }

        // Create CSV header
        const headers = ['Category', 'Average Score', 'Response Count', 'Performance', 'Correlation'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...categoryStats.map(stat => [
                `"${stat.category}"`,
                `${stat.avgScore}%`,
                stat.count,
                stat.performanceText,
                stat.correlation
            ].join(','))
        ].join('\n');

        this.downloadFile(
            csvContent,
            `survey-category-stats-${new Date().toISOString().split('T')[0]}.csv`,
            'text/csv'
        );

        return categoryStats.length;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Utility method to validate export requirements
    validateExportRequirements() {
        const issues = [];

        // Check if jsPDF is available for PDF exports
        if (typeof window.jspdf === 'undefined') {
            issues.push('jsPDF library is not loaded - PDF export will not work');
        }

        // Check if there's data to export
        if (this.dataService.getFilteredData().length === 0) {
            issues.push('No data available for export');
        }

        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    // Get export statistics
    getExportStats() {
        const filteredData = this.dataService.getFilteredData();
        const emailData = this.dataService.getEmailData();
        const categoryStats = this.dataService.getCategoryStats();

        return {
            totalResponses: filteredData.length,
            emailResponses: emailData.length,
            categoriesAvailable: categoryStats.length,
            dateRange: {
                earliest: filteredData.length > 0 ? 
                    new Date(Math.min(...filteredData.map(item => new Date(item.timestamp)))).toLocaleDateString() : 'N/A',
                latest: filteredData.length > 0 ? 
                    new Date(Math.max(...filteredData.map(item => new Date(item.timestamp)))).toLocaleDateString() : 'N/A'
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportService;
} else {
    window.ExportService = ExportService;
}