/*
 * 404 Finder: Auto-Search Redirector
 * Copyright (C) 2025 by John Moremm L. Abuyabor
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Debug Logger Module for 404 Finder: Auto-Search Redirector Extension
 * 
 * This module provides a centralized logging system with configurable verbosity levels.
 * It's designed specifically for Chrome extension debugging and includes:
 * - Multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
 * - Performance monitoring capabilities
 * - Structured logging with timestamps and context
 * - Chrome extension-specific debugging features
 * 
 * @module debugLogger
 */

// Log levels enumeration - lower number = higher priority
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
};

// Color codes for console output (makes debugging easier in Chrome DevTools)
const LOG_COLORS = {
    ERROR: 'color: #ff0000; font-weight: bold;',
    WARN: 'color: #ff9800; font-weight: bold;',
    INFO: 'color: #2196f3;',
    DEBUG: 'color: #4caf50;',
    TRACE: 'color: #9e9e9e;'
};

class DebugLogger {
    constructor() {
        // Production mode - set to true to disable ALL logging
        this.isProduction = true;
        
        this.currentLevel = LOG_LEVELS.ERROR; // Default log level - production setting
        this.performanceMetrics = new Map();
        this.logHistory = [];
        this.maxHistorySize = 1000;
        
        // Initialize logger settings from storage
        this.initializeSettings();
    }
    
    /**
     * Initialize logger settings from Chrome storage
     * This allows persisting debug settings across extension reloads
     */
    async initializeSettings() {
        try {
            const settings = await chrome.storage.local.get('debugSettings');
            if (settings.debugSettings) {
                this.currentLevel = settings.debugSettings.logLevel || LOG_LEVELS.INFO;
                this.maxHistorySize = settings.debugSettings.maxHistorySize || 1000;
            }
        } catch (error) {
            console.error('Failed to load debug settings:', error);
        }
    }
    
    /**
     * Set the current log level
     * @param {string} level - Log level name (ERROR, WARN, INFO, DEBUG, TRACE)
     */
    setLogLevel(level) {
        if (LOG_LEVELS.hasOwnProperty(level)) {
            this.currentLevel = LOG_LEVELS[level];
            this.saveSettings();
            this.info(`Log level changed to: ${level}`);
        } else {
            this.error(`Invalid log level: ${level}`);
        }
    }
    
    /**
     * Save current settings to Chrome storage
     */
    async saveSettings() {
        try {
            await chrome.storage.local.set({
                debugSettings: {
                    logLevel: this.currentLevel,
                    maxHistorySize: this.maxHistorySize
                }
            });
        } catch (error) {
            console.error('Failed to save debug settings:', error);
        }
    }
    
    /**
     * Core logging method
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} context - Additional context data
     */
    log(level, message, context = {}) {
        // In production mode, disable ALL logging
        if (this.isProduction) {
            return;
        }
        
        const levelValue = LOG_LEVELS[level];
        
        // Check if this log level should be displayed
        if (levelValue > this.currentLevel) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            context,
            // Include Chrome extension context
            tabId: context.tabId || 'background',
            url: context.url || 'N/A'
        };
        
        // Add to history (for export/analysis)
        this.addToHistory(logEntry);
        
        // Format and output to console
        const prefix = `[${timestamp}] [${level}]`;
        const style = LOG_COLORS[level];
        
        // Chrome DevTools tip: Use %c for styled console output
        console.log(`%c${prefix} ${message}`, style, context);
        
        // For errors, also log the stack trace if available
        if (level === 'ERROR' && context.error) {
            console.error(context.error);
        }
    }
    
    /**
     * Add log entry to history
     * @param {Object} logEntry - Log entry to store
     */
    addToHistory(logEntry) {
        this.logHistory.push(logEntry);
        
        // Maintain history size limit
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }
    
    // Convenience methods for different log levels
    error(message, context = {}) {
        this.log('ERROR', message, context);
    }
    
    warn(message, context = {}) {
        this.log('WARN', message, context);
    }
    
    info(message, context = {}) {
        this.log('INFO', message, context);
    }
    
    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }
    
    trace(message, context = {}) {
        this.log('TRACE', message, context);
    }
    
    /**
     * Performance monitoring - start a timer
     * @param {string} operation - Name of the operation to monitor
     * @param {Object} metadata - Additional metadata about the operation
     */
    startTimer(operation, metadata = {}) {
        const startTime = performance.now();
        this.performanceMetrics.set(operation, {
            startTime,
            metadata,
            status: 'running'
        });
        
        this.debug(`Performance timer started: ${operation}`, { metadata });
    }
    
    /**
     * Performance monitoring - end a timer and log the duration
     * @param {string} operation - Name of the operation
     * @param {Object} result - Result data to log with the timing
     */
    endTimer(operation, result = {}) {
        const metric = this.performanceMetrics.get(operation);
        
        if (!metric) {
            this.warn(`No timer found for operation: ${operation}`);
            return;
        }
        
        const endTime = performance.now();
        const duration = endTime - metric.startTime;
        
        // Update metric
        metric.endTime = endTime;
        metric.duration = duration;
        metric.status = 'completed';
        metric.result = result;
        
        // Log performance data
        this.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, {
            duration,
            metadata: metric.metadata,
            result
        });
        
        // Chrome DevTools tip: Performance data can be viewed in the Performance tab
        if (duration > 1000) {
            this.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, {
                operation,
                duration,
                threshold: 1000
            });
        }
    }
    
    /**
     * Log a group of related messages (useful for complex operations)
     * @param {string} groupName - Name of the group
     * @param {Function} callback - Function containing the grouped logs
     */
    group(groupName, callback) {
        console.group(groupName);
        this.debug(`=== Start group: ${groupName} ===`);
        
        try {
            callback();
        } catch (error) {
            this.error(`Error in group ${groupName}:`, { error });
            throw error;
        } finally {
            this.debug(`=== End group: ${groupName} ===`);
            console.groupEnd();
        }
    }
    
    /**
     * Export log history (useful for debugging and bug reports)
     * @returns {string} JSON string of log history
     */
    exportLogs() {
        return JSON.stringify(this.logHistory, null, 2);
    }
    
    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
        this.info('Log history cleared');
    }
    
    /**
     * Get performance metrics summary
     * @returns {Object} Summary of all performance metrics
     */
    getPerformanceSummary() {
        const summary = {};
        
        for (const [operation, metric] of this.performanceMetrics) {
            summary[operation] = {
                duration: metric.duration,
                status: metric.status,
                metadata: metric.metadata
            };
        }
        
        return summary;
    }
    
    /**
     * Chrome Extension specific: Log message passing between components
     * @param {string} direction - 'sent' or 'received'
     * @param {Object} message - The message object
     * @param {Object} sender - Sender information
     */
    logMessage(direction, message, sender = {}) {
        const context = {
            messageType: message.type || 'unknown',
            sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
            url: sender.url || sender.tab?.url || 'N/A'
        };
        
        this.debug(`Message ${direction}: ${message.type}`, {
            ...context,
            payload: message
        });
    }
    
    /**
     * Log Chrome API errors with helpful debugging information
     * @param {string} apiName - Name of the Chrome API that failed
     * @param {Error} error - The error object
     * @param {Object} context - Additional context
     */
    logChromeApiError(apiName, error, context = {}) {
        // Chrome extension debugging tip: chrome.runtime.lastError is often the culprit
        const chromeError = chrome.runtime.lastError;
        
        this.error(`Chrome API Error in ${apiName}`, {
            error: error.message || error,
            chromeError: chromeError ? chromeError.message : null,
            apiName,
            ...context
        });
        
        // Provide helpful debugging tips based on common errors
        if (chromeError?.message.includes('Cannot access')) {
            this.info('Debugging tip: Check manifest permissions for this API');
        } else if (chromeError?.message.includes('Extension context invalidated')) {
            this.info('Debugging tip: Extension was likely reloaded. Refresh the page.');
        }
    }
}

// Create singleton instance
const logger = new DebugLogger();

// Export both the instance and the class (for testing purposes)
export { logger as default, DebugLogger, LOG_LEVELS };

/**
 * Chrome Extension Debugging Tips:
 * 
 * 1. View background script logs:
 *    - Go to chrome://extensions
 *    - Enable Developer mode
 *    - Click "background page" or "service worker" link
 * 
 * 2. View content script logs:
 *    - Open DevTools on the page where the content script runs
 *    - Check the Console tab
 * 
 * 3. Debug popup:
 *    - Right-click the extension icon and select "Inspect popup"
 * 
 * 4. Common debugging commands:
 *    - chrome.runtime.reload() - Reload the extension
 *    - chrome.management.setEnabled(extensionId, false) - Disable extension
 *    - chrome.storage.local.clear() - Clear extension storage
 * 
 * 5. Performance profiling:
 *    - Use Chrome DevTools Performance tab
 *    - Look for extension-specific entries
 * 
 * 6. Memory leaks:
 *    - Use Heap Snapshots in DevTools Memory tab
 *    - Look for detached DOM nodes and event listeners
 */
