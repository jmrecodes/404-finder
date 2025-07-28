/*
 * 404 Finder - Auto-Search Redirector
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
 * Error Handler Module for 404 Finder Extension
 * 
 * This module provides comprehensive error handling and recovery mechanisms
 * to ensure the extension remains stable and functional even when errors occur.
 * 
 * Features:
 * - Automatic error recovery with retry logic
 * - Error categorization and prioritization
 * - User-friendly error notifications
 * - Error reporting and analytics
 * - Chrome extension-specific error handling
 * 
 * @module errorHandler
 */

import logger from './debugLogger.js';

// Error severity levels
const ERROR_SEVERITY = {
    CRITICAL: 'critical',   // Extension breaking errors
    HIGH: 'high',          // Feature breaking errors
    MEDIUM: 'medium',      // Degraded functionality
    LOW: 'low'             // Minor issues
};

// Error categories for better organization
const ERROR_CATEGORY = {
    NETWORK: 'network',
    STORAGE: 'storage',
    PERMISSION: 'permission',
    RUNTIME: 'runtime',
    USER_INPUT: 'user_input',
    EXTERNAL_API: 'external_api',
    CHROME_API: 'chrome_api'
};

// Retry configuration
const RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,      // Base delay in milliseconds
    maxDelay: 30000,      // Maximum delay between retries
    backoffMultiplier: 2  // Exponential backoff multiplier
};

class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.recoveryStrategies = new Map();
        this.errorCallbacks = new Map();
        this.isRecovering = false;
        
        // Register default recovery strategies
        this.registerDefaultStrategies();
        
        // Set up global error handlers
        this.setupGlobalHandlers();
    }
    
    /**
     * Set up global error handlers for the extension
     */
    setupGlobalHandlers() {
        // Handle uncaught errors in the extension
        self.addEventListener('error', (event) => {
            this.handleError(new Error(event.message), {
                category: ERROR_CATEGORY.RUNTIME,
                severity: ERROR_SEVERITY.HIGH,
                context: {
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno
                }
            });
        });
        
        // Handle unhandled promise rejections
        self.addEventListener('unhandledrejection', (event) => {
            this.handleError(new Error(event.reason), {
                category: ERROR_CATEGORY.RUNTIME,
                severity: ERROR_SEVERITY.HIGH,
                context: {
                    promise: event.promise
                }
            });
            
            // Prevent default browser error handling
            event.preventDefault();
        });
        
        // Chrome extension specific: Handle runtime errors
        if (chrome.runtime) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                // Wrap message handlers to catch errors
                try {
                    // Original handler logic would go here
                    return true;
                } catch (error) {
                    this.handleError(error, {
                        category: ERROR_CATEGORY.RUNTIME,
                        context: { request, sender }
                    });
                    sendResponse({ error: true, message: error.message });
                    return false;
                }
            });
        }
    }
    
    /**
     * Register default recovery strategies for common error types
     */
    registerDefaultStrategies() {
        // Network error recovery
        this.registerRecoveryStrategy(ERROR_CATEGORY.NETWORK, async (error, context) => {
            logger.info('Attempting network error recovery', { error: error.message });
            
            // Check if we're offline
            if (!navigator.onLine) {
                logger.warn('Browser is offline, waiting for connection...');
                await this.waitForOnline();
            }
            
            // Retry the failed operation
            return this.retryWithBackoff(context.operation, context.params);
        });
        
        // Storage error recovery
        this.registerRecoveryStrategy(ERROR_CATEGORY.STORAGE, async (error, context) => {
            logger.info('Attempting storage error recovery', { error: error.message });
            
            // Check storage quota
            if (error.message.includes('quota')) {
                await this.cleanupStorage();
            }
            
            // Clear corrupted data if necessary
            if (error.message.includes('corrupted')) {
                await this.resetStorage(context.key);
            }
            
            return true;
        });
        
        // Permission error recovery
        this.registerRecoveryStrategy(ERROR_CATEGORY.PERMISSION, async (error, context) => {
            logger.info('Handling permission error', { error: error.message });
            
            // Request missing permissions
            if (context.requiredPermissions) {
                const granted = await this.requestPermissions(context.requiredPermissions);
                return granted;
            }
            
            // Notify user about permission requirements
            this.notifyUser('Permission Required', 
                'Please grant the necessary permissions for this feature to work.');
            
            return false;
        });
        
        // Chrome API error recovery
        this.registerRecoveryStrategy(ERROR_CATEGORY.CHROME_API, async (error, context) => {
            logger.info('Handling Chrome API error', { error: error.message });
            
            // Handle extension context invalidated errors
            if (error.message.includes('Extension context invalidated')) {
                logger.warn('Extension context invalidated - extension was likely reloaded');
                this.notifyUser('Extension Updated', 
                    'The extension was updated. Please refresh the page to continue.');
                return false;
            }
            
            // Handle tab/window closed errors
            if (error.message.includes('No tab with id') || 
                error.message.includes('No window with id')) {
                logger.debug('Tab or window no longer exists', { context });
                return true; // Not really an error, just outdated reference
            }
            
            return false;
        });
    }
    
    /**
     * Main error handling method
     * @param {Error} error - The error object
     * @param {Object} options - Error handling options
     */
    async handleError(error, options = {}) {
        const {
            category = ERROR_CATEGORY.RUNTIME,
            severity = ERROR_SEVERITY.MEDIUM,
            context = {},
            silent = false,
            retry = true
        } = options;
        
        // Create error record
        const errorRecord = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack,
            category,
            severity,
            context,
            resolved: false
        };
        
        // Log the error
        logger.error(`Error occurred: ${error.message}`, {
            error,
            category,
            severity,
            context
        });
        
        // Add to error history
        this.addToHistory(errorRecord);
        
        // Execute error callbacks
        this.executeCallbacks(errorRecord);
        
        // Attempt recovery if enabled
        if (retry && !this.isRecovering) {
            this.isRecovering = true;
            const recovered = await this.attemptRecovery(errorRecord);
            this.isRecovering = false;
            
            if (recovered) {
                errorRecord.resolved = true;
                logger.info('Error recovered successfully', { errorId: errorRecord.id });
                return;
            }
        }
        
        // Notify user if not silent and not recovered
        if (!silent && !errorRecord.resolved) {
            this.notifyUserAboutError(errorRecord);
        }
        
        // Report critical errors
        if (severity === ERROR_SEVERITY.CRITICAL) {
            this.reportCriticalError(errorRecord);
        }
    }
    
    /**
     * Attempt to recover from an error using registered strategies
     * @param {Object} errorRecord - The error record
     * @returns {Promise<boolean>} - Whether recovery was successful
     */
    async attemptRecovery(errorRecord) {
        const strategy = this.recoveryStrategies.get(errorRecord.category);
        
        if (!strategy) {
            logger.debug('No recovery strategy for category', { category: errorRecord.category });
            return false;
        }
        
        try {
            logger.info('Attempting error recovery', { 
                category: errorRecord.category,
                errorId: errorRecord.id 
            });
            
            const recovered = await strategy(
                new Error(errorRecord.message), 
                errorRecord.context
            );
            
            return recovered;
        } catch (recoveryError) {
            logger.error('Recovery strategy failed', { 
                error: recoveryError,
                originalError: errorRecord 
            });
            return false;
        }
    }
    
    /**
     * Retry an operation with exponential backoff
     * @param {Function} operation - The operation to retry
     * @param {Array} params - Parameters for the operation
     * @returns {Promise<any>} - Result of the operation
     */
    async retryWithBackoff(operation, params = []) {
        let lastError;
        
        for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
            try {
                logger.debug(`Retry attempt ${attempt}/${RETRY_CONFIG.maxAttempts}`);
                const result = await operation(...params);
                return result;
            } catch (error) {
                lastError = error;
                
                if (attempt < RETRY_CONFIG.maxAttempts) {
                    const delay = Math.min(
                        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
                        RETRY_CONFIG.maxDelay
                    );
                    
                    logger.debug(`Waiting ${delay}ms before retry`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Register a recovery strategy for a specific error category
     * @param {string} category - Error category
     * @param {Function} strategy - Recovery strategy function
     */
    registerRecoveryStrategy(category, strategy) {
        this.recoveryStrategies.set(category, strategy);
        logger.debug('Recovery strategy registered', { category });
    }
    
    /**
     * Register a callback to be executed when errors occur
     * @param {string} id - Unique identifier for the callback
     * @param {Function} callback - Callback function
     */
    registerErrorCallback(id, callback) {
        this.errorCallbacks.set(id, callback);
    }
    
    /**
     * Execute all registered error callbacks
     * @param {Object} errorRecord - The error record
     */
    executeCallbacks(errorRecord) {
        for (const [id, callback] of this.errorCallbacks) {
            try {
                callback(errorRecord);
            } catch (callbackError) {
                logger.error('Error callback failed', { 
                    callbackId: id, 
                    error: callbackError 
                });
            }
        }
    }
    
    /**
     * Notify user about an error
     * @param {Object} errorRecord - The error record
     */
    notifyUserAboutError(errorRecord) {
        const title = this.getErrorTitle(errorRecord);
        const message = this.getErrorMessage(errorRecord);
        
        // For Chrome extensions, we can use notifications API
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/assets/icon-48.png',
                title: title,
                message: message,
                priority: errorRecord.severity === ERROR_SEVERITY.CRITICAL ? 2 : 1
            });
        } else {
            // Fallback to console warning
            console.warn(`${title}: ${message}`);
        }
    }
    
    /**
     * Utility: Notify user with a custom message
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    notifyUser(title, message) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/assets/icon-48.png',
                title: title,
                message: message
            });
        }
    }
    
    /**
     * Get user-friendly error title
     * @param {Object} errorRecord - The error record
     * @returns {string} - Error title
     */
    getErrorTitle(errorRecord) {
        const titles = {
            [ERROR_CATEGORY.NETWORK]: 'Network Error',
            [ERROR_CATEGORY.STORAGE]: 'Storage Error',
            [ERROR_CATEGORY.PERMISSION]: 'Permission Required',
            [ERROR_CATEGORY.RUNTIME]: 'Runtime Error',
            [ERROR_CATEGORY.USER_INPUT]: 'Invalid Input',
            [ERROR_CATEGORY.EXTERNAL_API]: 'External Service Error',
            [ERROR_CATEGORY.CHROME_API]: 'Extension Error'
        };
        
        return titles[errorRecord.category] || 'Error Occurred';
    }
    
    /**
     * Get user-friendly error message
     * @param {Object} errorRecord - The error record
     * @returns {string} - Error message
     */
    getErrorMessage(errorRecord) {
        // Map technical errors to user-friendly messages
        const messageMap = {
            'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
            'QuotaExceededError': 'Storage limit reached. Please clear some data.',
            'NetworkError': 'Network connection failed. Please try again.',
            'Extension context invalidated': 'Extension was updated. Please refresh the page.'
        };
        
        for (const [key, friendlyMessage] of Object.entries(messageMap)) {
            if (errorRecord.message.includes(key)) {
                return friendlyMessage;
            }
        }
        
        return 'An unexpected error occurred. Please try again.';
    }
    
    /**
     * Report critical errors for analysis
     * @param {Object} errorRecord - The error record
     */
    async reportCriticalError(errorRecord) {
        logger.warn('Critical error detected', { errorRecord });
        
        // In a production extension, you might send this to an analytics service
        // For now, we'll store it locally for debugging
        try {
            const criticalErrors = await chrome.storage.local.get('criticalErrors') || {};
            const errors = criticalErrors.criticalErrors || [];
            errors.push({
                ...errorRecord,
                userAgent: navigator.userAgent,
                extensionVersion: chrome.runtime.getManifest().version
            });
            
            // Keep only last 50 critical errors
            if (errors.length > 50) {
                errors.shift();
            }
            
            await chrome.storage.local.set({ criticalErrors: errors });
        } catch (storageError) {
            logger.error('Failed to store critical error', { error: storageError });
        }
    }
    
    /**
     * Add error to history
     * @param {Object} errorRecord - The error record
     */
    addToHistory(errorRecord) {
        this.errorHistory.push(errorRecord);
        
        // Keep only last 100 errors
        if (this.errorHistory.length > 100) {
            this.errorHistory.shift();
        }
    }
    
    /**
     * Utility: Wait for browser to come online
     * @returns {Promise<void>}
     */
    waitForOnline() {
        return new Promise((resolve) => {
            if (navigator.onLine) {
                resolve();
            } else {
                const handler = () => {
                    window.removeEventListener('online', handler);
                    resolve();
                };
                window.addEventListener('online', handler);
            }
        });
    }
    
    /**
     * Utility: Clean up storage to free space
     * @returns {Promise<void>}
     */
    async cleanupStorage() {
        logger.info('Cleaning up storage...');
        
        try {
            // Remove old 404 entries (older than 30 days)
            const data = await chrome.storage.local.get('404Errors');
            if (data['404Errors']) {
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                const filtered = data['404Errors'].filter(error => 
                    error.timestamp > thirtyDaysAgo
                );
                
                await chrome.storage.local.set({ '404Errors': filtered });
                logger.info(`Cleaned up ${data['404Errors'].length - filtered.length} old entries`);
            }
        } catch (error) {
            logger.error('Storage cleanup failed', { error });
        }
    }
    
    /**
     * Utility: Reset storage for a specific key
     * @param {string} key - Storage key to reset
     * @returns {Promise<void>}
     */
    async resetStorage(key) {
        logger.warn(`Resetting storage for key: ${key}`);
        
        try {
            await chrome.storage.local.remove(key);
            logger.info(`Storage key ${key} reset successfully`);
        } catch (error) {
            logger.error('Storage reset failed', { error, key });
        }
    }
    
    /**
     * Utility: Request Chrome permissions
     * @param {Array<string>} permissions - Permissions to request
     * @returns {Promise<boolean>} - Whether permissions were granted
     */
    async requestPermissions(permissions) {
        try {
            const granted = await chrome.permissions.request({
                permissions: permissions
            });
            
            if (granted) {
                logger.info('Permissions granted', { permissions });
            } else {
                logger.warn('Permissions denied', { permissions });
            }
            
            return granted;
        } catch (error) {
            logger.error('Failed to request permissions', { error, permissions });
            return false;
        }
    }
    
    /**
     * Utility: Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Generate unique error ID
     * @returns {string} - Unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorHistory.length,
            byCategory: {},
            bySeverity: {},
            resolved: 0,
            unresolved: 0
        };
        
        for (const error of this.errorHistory) {
            // Count by category
            stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
            
            // Count by severity
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
            
            // Count resolved/unresolved
            if (error.resolved) {
                stats.resolved++;
            } else {
                stats.unresolved++;
            }
        }
        
        return stats;
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export both instance and class
export { errorHandler as default, ErrorHandler, ERROR_SEVERITY, ERROR_CATEGORY };

/**
 * Chrome Extension Error Handling Best Practices:
 * 
 * 1. Always check chrome.runtime.lastError after Chrome API calls
 * 2. Use try-catch blocks around async Chrome API calls
 * 3. Handle "Extension context invalidated" errors gracefully
 * 4. Implement retry logic for network-dependent operations
 * 5. Provide user-friendly error messages
 * 6. Log errors for debugging but don't expose technical details to users
 * 7. Clean up resources (listeners, timers) when errors occur
 * 8. Test error scenarios during development
 */
