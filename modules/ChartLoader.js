// Chart Loader Module - Dynamic Loading for Large Libraries

class ChartLoader {
    constructor() {
        this.loadedLibraries = new Set();
        this.loadingPromises = new Map();
        this.config = {
            chartjs: {
                url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
                globalName: 'Chart'
            },
            jspdf: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                integrity: 'sha256-CfJpYYKfKSncbvXgN+lXieFjOaQOe1QXhCdwXSDP+Hk=',
                globalName: 'jsPDF'
            }
        };
    }

    /**
     * Dynamically load a script with integrity check
     * @param {string} libraryName - Name of the library to load
     * @returns {Promise} Promise that resolves when library is loaded
     */
    async loadLibrary(libraryName) {
        // Check if library is already loaded
        if (this.loadedLibraries.has(libraryName)) {
            console.log(`📚 Library ${libraryName} already loaded`);
            return Promise.resolve();
        }

        // Check if library is currently being loaded
        if (this.loadingPromises.has(libraryName)) {
            console.log(`⏳ Library ${libraryName} is already loading, waiting...`);
            return this.loadingPromises.get(libraryName);
        }

        const config = this.config[libraryName];
        if (!config) {
            throw new Error(`Unknown library: ${libraryName}`);
        }

        console.log(`🔄 Loading library: ${libraryName}`);
        
        const loadPromise = this._loadScript(config)
            .then(() => {
                this.loadedLibraries.add(libraryName);
                this.loadingPromises.delete(libraryName);
                console.log(`✅ Library ${libraryName} loaded successfully`);
                
                // Verify the library is available globally
                if (config.globalName && typeof window[config.globalName] === 'undefined') {
                    throw new Error(`Library ${libraryName} loaded but ${config.globalName} is not available globally`);
                }
            })
            .catch(error => {
                this.loadingPromises.delete(libraryName);
                console.error(`❌ Failed to load library ${libraryName}:`, error);
                throw error;
            });

        this.loadingPromises.set(libraryName, loadPromise);
        return loadPromise;
    }

    /**
     * Load Chart.js specifically with fallback
     * @returns {Promise} Promise that resolves when Chart.js is loaded
     */
    async loadChartJS() {
        try {
            await this.loadLibrary('chartjs');
            return window.Chart;
        } catch (error) {
            console.warn('Primary Chart.js loading failed, trying fallback without integrity check:', error);
            // Fallback: try loading without integrity check
            const fallbackConfig = {
                url: this.config.chartjs.url,
                globalName: 'Chart'
                // No integrity check for fallback
            };
            await this._loadScript(fallbackConfig);
            if (typeof window.Chart === 'undefined') {
                throw new Error('Chart.js failed to load even with fallback method');
            }
            return window.Chart;
        }
    }

    /**
     * Load jsPDF specifically
     * @returns {Promise} Promise that resolves when jsPDF is loaded
     */
    async loadJsPDF() {
        await this.loadLibrary('jspdf');
        return window.jsPDF;
    }

    /**
     * Load multiple libraries in parallel
     * @param {string[]} libraryNames - Array of library names to load
     * @returns {Promise} Promise that resolves when all libraries are loaded
     */
    async loadMultiple(libraryNames) {
        console.log(`🔄 Loading multiple libraries: ${libraryNames.join(', ')}`);
        const loadPromises = libraryNames.map(name => this.loadLibrary(name));
        await Promise.all(loadPromises);
        console.log(`✅ All libraries loaded: ${libraryNames.join(', ')}`);
    }

    /**
     * Check if a library is loaded
     * @param {string} libraryName - Name of the library to check
     * @returns {boolean} True if library is loaded
     */
    isLoaded(libraryName) {
        return this.loadedLibraries.has(libraryName);
    }

    /**
     * Get loading status of all libraries
     * @returns {Object} Object with loading status of each library
     */
    getLoadingStatus() {
        const status = {};
        Object.keys(this.config).forEach(libraryName => {
            status[libraryName] = {
                loaded: this.loadedLibraries.has(libraryName),
                loading: this.loadingPromises.has(libraryName)
            };
        });
        return status;
    }

    /**
     * Private method to load a script with integrity check
     * @param {Object} config - Library configuration
     * @returns {Promise} Promise that resolves when script is loaded
     */
    _loadScript(config) {
        return new Promise((resolve, reject) => {
            // Check if script is already in DOM
            const existingScript = document.querySelector(`script[src="${config.url}"]`);
            if (existingScript) {
                if (existingScript.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                // Wait for existing script to load
                existingScript.addEventListener('load', resolve);
                existingScript.addEventListener('error', reject);
                return;
            }

            const script = document.createElement('script');
            script.src = config.url;
            script.crossOrigin = 'anonymous';
            
            if (config.integrity) {
                script.integrity = config.integrity;
            }

            // Add timeout for loading
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout loading script: ${config.url}`));
            }, 30000); // 30 second timeout

            script.onload = () => {
                clearTimeout(timeout);
                script.dataset.loaded = 'true';
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`Failed to load script: ${config.url}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Preload libraries for better performance
     * @param {string[]} libraryNames - Array of library names to preload
     */
    async preloadLibraries(libraryNames = []) {
        if (libraryNames.length === 0) {
            return;
        }

        console.log(`🚀 Preloading libraries: ${libraryNames.join(', ')}`);
        
        // Use requestIdleCallback if available for non-blocking preload
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                this.loadMultiple(libraryNames).catch(error => {
                    console.warn('Preload failed:', error);
                });
            });
        } else {
            // Fallback to setTimeout
            setTimeout(() => {
                this.loadMultiple(libraryNames).catch(error => {
                    console.warn('Preload failed:', error);
                });
            }, 100);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartLoader;
} else {
    window.ChartLoader = ChartLoader;
}