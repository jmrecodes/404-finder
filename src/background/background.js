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
 * Background Service Worker for 404 Finder: Auto-Search Redirector Extension
 * 
 * This service worker handles:
 * 1. HTTP 404 detection via webRequest API
 * 2. Message routing between content scripts and popup
 * 3. Storage management for errors and settings
 * 4. Search URL generation and auto-search eligibility
 * 5. Navigation error tracking
 * 
 * Note: Soft 404 detection is handled by the content script to avoid code duplication
 */

// Import modules
import { addDomain, removeDomain, isDomainListed } from './domainManager.js';
import { generateSearchUrls as genSearchUrls, constructSearchUrl } from '../search/searchEngineConfig.js';

// Map to track errors by tab ID
const tabErrors = new Map();

// Map to track ongoing navigations
const navigationStates = new Map();

/**
 * Educational: Chrome's webNavigation API
 * 
 * The webNavigation API provides notifications about the status of navigation requests
 * in-flight. It's more reliable than webRequest for detecting navigation outcomes because:
 * - It fires after the browser has processed the response
 * - It provides error details when navigation fails
 * - It works with all types of navigations (links, redirects, form submissions, etc.)
 */

// Listen for navigation errors like network failures
chrome.webNavigation.onErrorOccurred.addListener((details) => {
    // Educational: Error types in Chrome
    // - net::ERR_NAME_NOT_RESOLVED: DNS lookup failed
    // - net::ERR_CONNECTION_REFUSED: Server refused connection
    // - net::ERR_ABORTED: Navigation was aborted
    // - HTTP errors (404, 500, etc.) don't trigger onErrorOccurred!
    
    // Store error information
    if (!tabErrors.has(details.tabId)) {
        tabErrors.set(details.tabId, []);
    }
    
    tabErrors.get(details.tabId).push({
        url: details.url,
        error: details.error,
        timestamp: details.timeStamp,
        type: 'navigation_error'
    });
});

// Listen for completed navigations - content script will handle soft 404 detection
chrome.webNavigation.onCompleted.addListener(async (details) => {
    // Only process main frame navigations
    if (details.frameId !== 0) return;
    
    // Content script will detect soft 404s and notify us via pageDetected404 message
});

// Listen for HTTP response headers to catch actual 404 status codes
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        // Only process main frame requests
        if (details.type !== 'main_frame') return;
        
        // Check for 404 status code
        if (details.statusCode === 404) {
            // Store the actual HTTP 404
            if (!tabErrors.has(details.tabId)) {
                tabErrors.set(details.tabId, []);
            }
            
            tabErrors.get(details.tabId).push({
                url: details.url,
                timestamp: details.timeStamp,
                type: 'http_404',
                statusCode: details.statusCode
            });
            
            // Badge feature removed for cleaner UI
            
            // Store in persistent storage
            store404Error(details.url, details.tabId, 100, ['HTTP 404 Status']);
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Soft 404 detection is now handled entirely by the content script
// This eliminates code duplication and simplifies the architecture

// Store 404 error in persistent storage
async function store404Error(url, tabId, confidence, indicators) {
    try {
        // Get existing errors
        const result = await chrome.storage.local.get(['errors']);
        const errors = result.errors || [];
        
        // Add new error
        errors.push({
            url,
            tabId,
            confidence,
            indicators,
            timestamp: new Date().toISOString(),
            id: `error_${Date.now()}_${tabId}`
        });
        
        // Keep only last 1000 errors
        if (errors.length > 1000) {
            errors.splice(0, errors.length - 1000);
        }
        
        // Save back to storage
        await chrome.storage.local.set({ errors });
    } catch (error) {
        console.error('Error storing 404:', error);
    }
}

// Clean up tab data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    tabErrors.delete(tabId);
    navigationStates.delete(tabId);
});

// Store notification ID to search URL mapping
const notificationSearchUrls = new Map();

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    const notificationData = notificationSearchUrls.get(notificationId);
    if (notificationData && notificationData.url) {
        // Open the search URL in a new tab
        chrome.tabs.create({ url: notificationData.url });
        // Clear the notification
        chrome.notifications.clear(notificationId);
        // Remove from mapping
        notificationSearchUrls.delete(notificationId);
    }
});

// Clean up old notification mappings periodically
setInterval(() => {
    // Keep only recent notifications (last hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, data] of notificationSearchUrls.entries()) {
        if (data.timestamp < oneHourAgo) {
            notificationSearchUrls.delete(id);
        }
    }
}, 3600000); // Run every hour

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabErrors') {
        const errors = tabErrors.get(request.tabId) || [];
        sendResponse({ errors });
        return true;
    }
    
    if (request.action === 'getAllErrors') {
        chrome.storage.local.get(['errors'], (result) => {
            sendResponse({ errors: result.errors || [] });
        });
        return true;
    }
    
    if (request.action === 'clearErrors') {
        tabErrors.clear();
        chrome.storage.local.set({ errors: [] });
        
        // Badge feature removed - no badges to clear
        
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'pageDetected404') {
        // Store the 404 error detected by content script
        const tabId = sender.tab?.id;
        if (tabId) {
            // Store in memory for popup display
            if (!tabErrors.has(tabId)) {
                tabErrors.set(tabId, []);
            }
            
            tabErrors.get(tabId).push({
                url: request.url,
                timestamp: Date.now(),
                type: 'soft_404',
                title: request.title
            });
            
            // Store in persistent storage
            store404Error(request.url, tabId, 90, ['Content script detection']);
        }
        
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'checkAutoSearchEligibility') {
        checkAutoSearchEligibility(request.domain, request.url)
            .then(response => sendResponse(response))
            .catch(error => {
                sendResponse({ shouldAutoSearch: false, reason: 'internal_error' });
            });
        return true; // Maintain the message channel open
    }

    if (request.action === 'generateSearchUrl') {
        generateSearchUrl(request.url, request.title, request.searchEngine, request.queryTemplate)
            .then(searchUrl => {
                sendResponse({ success: true, searchUrl });
            })
            .catch(error => {
                sendResponse({ success: false });
            });
        return true;
    }

    if (request.action === 'createAutoSearchNotification') {
        createAutoSearchNotification(request.url, request.searchEngine, request.searchUrl)
            .then(notificationId => sendResponse({ success: true, notificationId }))
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

// Check if auto-search should be enabled for a given domain
async function checkAutoSearchEligibility(domain, url) {
    try {
        const settings = await chrome.storage.local.get(['isExtensionActive', 'enableAutoSearch', 'defaultSearchEngine', 'defaultQueryTemplate', 'whitelistDomains', 'blacklistDomains']);
        
        // Check if extension is globally disabled first
        if (settings.isExtensionActive === false) {
            return { shouldAutoSearch: false, reason: 'extension_disabled' };
        }
        
        const isWhitelisted = await isDomainListed(domain, true);
        const isBlacklisted = await isDomainListed(domain, false);

        // Check if blacklisted first - this takes precedence
        if (isBlacklisted) {
            return { shouldAutoSearch: false, reason: 'domain_blacklisted' };
        }

        // Determine if auto-search should be enabled
        let shouldAutoSearch = false;
        
        // Whitelist overrides global settings - always auto-search on whitelisted domains
        if (isWhitelisted || settings.enableAutoSearch !== false) {
            // For non-whitelisted domains, respect global setting (default true)
            shouldAutoSearch = true;
        }

        if (!shouldAutoSearch) {
            return { shouldAutoSearch, reason: 'auto_search_disabled' };
        }

        // Return default search engine and query template
        return {
            shouldAutoSearch,
            searchEngine: settings.defaultSearchEngine || 'google',
            queryTemplate: settings.defaultQueryTemplate || 'domainAndKeywords'
        };
    } catch (error) {
        return { shouldAutoSearch: false, reason: 'error_retrieving_settings' };
    }
}

// Generate search URL based on configured templates
async function generateSearchUrl(url, title, searchEngine = 'google', queryTemplate = 'domainAndKeywords') {
    try {
        // Check if using custom search engine
        if (searchEngine === 'custom') {
            const settings = await chrome.storage.local.get(['customSearchUrl']);
            const customUrl = settings.customSearchUrl;
            
            if (!customUrl) {
                return null;
            }
            
            // Extract URL info for query construction
            const urlInfo = genSearchUrls(url, queryTemplate, title)[0];
            if (!urlInfo || !urlInfo.query) {
                return null;
            }
            
            // Replace {query} placeholder with actual query
            const searchUrl = customUrl.replace('{query}', encodeURIComponent(urlInfo.query));
            return searchUrl;
        }
        
        // Use predefined search engines
        const searchUrls = genSearchUrls(url, queryTemplate, title);
        const matchingEngine = searchUrls.find(su => su.engine.name.toLowerCase() === searchEngine.toLowerCase());
        return matchingEngine ? matchingEngine.url : null;
    } catch (error) {
        throw error;
    }
}

/**
 * Create a notification for auto-search action
 * 
 * @param {string} url - The 404 URL that triggered the search
 * @param {string} searchEngine - The search engine being used
 * @param {string} searchUrl - The search URL that will be opened
 * @returns {Promise<string>} The notification ID
 */
async function createAutoSearchNotification(url, searchEngine, searchUrl) {
    try {
        // Check if notifications are enabled
        const settings = await chrome.storage.local.get(['showAutoSearchNotifications']);
        if (settings.showAutoSearchNotifications === false) {
            // Notifications are disabled
            return null;
        }

        // Extract domain from URL for display
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Create notification ID
        const notificationId = `auto-search-${Date.now()}`;
        
        // Store the search URL mapping with timestamp
        notificationSearchUrls.set(notificationId, {
            url: searchUrl,
            timestamp: Date.now()
        });
        
        // Create the notification
        await chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
            title: '404 Page Auto-Search',
            message: `Searching for "${domain}" content on ${searchEngine}`,
            contextMessage: 'Click to open search results',
            priority: 1,
            // Chrome notification API limitations:
            // - requireInteraction is not supported in all platforms
            // - Notification duration is controlled by the OS
            // - Rich notifications (with buttons) have limited support
            // - Sound customization is limited
        });
        
        // Auto-clear notification after 10 seconds
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
            // Keep the URL mapping for click handling even after clearing
        }, 10000);
        
        return notificationId;
    } catch (error) {
        throw error;
    }
}

/**
 * Educational: Chrome Notifications API Limitations
 * 
 * 1. **Platform Differences**:
 *    - Windows: Notifications appear in Action Center
 *    - macOS: Uses native notification center
 *    - Linux: Depends on desktop environment
 *    
 * 2. **Permission Requirements**:
 *    - Must be declared in manifest.json
 *    - No runtime permission prompt needed (unlike web notifications)
 *    
 * 3. **Notification Types**:
 *    - 'basic': Simple text notification
 *    - 'image': Includes an image preview
 *    - 'list': Shows multiple items
 *    - 'progress': Shows a progress bar
 *    
 * 4. **Interaction Limitations**:
 *    - Maximum 2 buttons per notification
 *    - Button clicks require separate event listener
 *    - requireInteraction not universally supported
 *    
 * 5. **Timing and Persistence**:
 *    - Auto-dismiss timing varies by OS
 *    - Cannot guarantee notification persistence
 *    - May be grouped/collapsed by OS
 *    
 * 6. **Content Limitations**:
 *    - Title: ~30 characters visible
 *    - Message: ~100 characters visible
 *    - Icons should be 128x128 or larger
 *    
 * 7. **Rate Limiting**:
 *    - OS may throttle frequent notifications
 *    - Chrome may limit notifications per extension
 *    - Consider user experience with notification frequency
 */

// Initialize extension
// Extension is now ready to detect 404 errors

/**
 * Educational: Chrome Extension Architecture
 * 
 * This background service worker runs persistently and:
 * 1. Monitors all navigation events across all tabs
 * 2. Maintains a memory store (Map) for active tab errors
 * 3. Persists errors to chrome.storage for long-term storage
 * 4. Communicates with content scripts and popup via messaging
 * 5. Updates the extension badge to show error counts
 * 
 * Limitations:
 * - Chrome doesn't directly expose HTTP status codes to webNavigation API
 * - Content script injection may fail on some protected pages (chrome://, etc.)
 * - Some sites may block or interfere with content script execution
 * - Soft 404 detection is heuristic-based and may have false positives
 */


