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
 * Background Service Worker for 404 Finder Extension
 * 
 * This service worker detects 404 errors in two ways:
 * 1. Using webNavigation API to catch HTTP error responses
 * 2. Content analysis to detect "soft" 404s (pages that return 200 but display 404 content)
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
    console.log('Navigation error occurred:', details);
    
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

// Listen for completed navigations to check for HTTP and soft 404s
chrome.webNavigation.onCompleted.addListener(async (details) => {
    // Only process main frame navigations
    if (details.frameId !== 0) return;
    
    console.log('Navigation completed:', details.url);
    
    try {
        // First, try to get tab information to check HTTP status
        const tab = await chrome.tabs.get(details.tabId);
        
        // Educational: Chrome doesn't directly expose HTTP status codes
        // We need to use content scripts to analyze the page
        
        // Check if the page content indicates a 404 error
        const results = await chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: detect404Content,
            args: [details.url]
        });
        
        if (results && results[0] && results[0].result) {
            const { is404, confidence, indicators } = results[0].result;
            
            if (is404) {
                console.log(`404 detected on ${details.url} with confidence: ${confidence}`);
                
                // Store the 404 error
                if (!tabErrors.has(details.tabId)) {
                    tabErrors.set(details.tabId, []);
                }
                
                tabErrors.get(details.tabId).push({
                    url: details.url,
                    timestamp: details.timeStamp,
                    type: 'soft_404',
                    confidence,
                    indicators
                });
                
                // Update badge to show error count
                updateBadge(details.tabId);
                
                // Store in persistent storage
                await store404Error(details.url, details.tabId, confidence, indicators);
            }
        }
    } catch (error) {
        console.error('Error checking for 404:', error);
    }
});

// Listen for HTTP response headers to catch actual 404 status codes
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        // Only process main frame requests
        if (details.type !== 'main_frame') return;
        
        console.log(`HTTP ${details.statusCode} for ${details.url}`);
        
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
            
            // Update badge
            updateBadge(details.tabId);
            
            // Store in persistent storage
            store404Error(details.url, details.tabId, 100, ['HTTP 404 Status']);
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Function to detect 404 content in the page
function detect404Content(url) {
    /**
     * Educational: Soft 404 Detection
     * 
     * Many websites return HTTP 200 status but display 404 error content.
     * This function analyzes the page content to detect these "soft" 404s.
     * 
     * Detection strategies:
     * 1. Text content analysis - looking for common 404 phrases
     * 2. Title analysis - checking document title for 404 indicators
     * 3. Meta tag analysis - some sites use meta tags to indicate errors
     * 4. URL pattern analysis - checking for /404, /error, etc.
     */
    
    const indicators = [];
    let confidence = 0;
    
    // Common 404 error messages in multiple languages
    const errorPhrases = [
        // English
        '404', 'not found', 'page not found', 'file not found',
        'the page you requested', 'could not be found', 'does not exist',
        'page cannot be found', 'page you are looking for',
        'broken link', 'dead link', 'error 404', '404 error',
        'requested URL was not found', 'nothing found',
        'the requested resource could not be found',
        
        // Technical terms
        'HTTP 404', 'HTTP ERROR 404', '404 - File or directory not found',
        
        // Casual/funny 404 messages
        'oops', 'whoops', 'uh oh', 'page went missing',
        'lost in space', 'page has vanished',
        
        // URL patterns that might indicate 404 pages
        '/404', '/error', '/notfound', '/page-not-found'
    ];
    
    // Get page content
    const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
    const titleText = document.title ? document.title.toLowerCase() : '';
    const urlLower = url.toLowerCase();
    
    // Check title for 404 indicators
    errorPhrases.forEach(phrase => {
        if (titleText.includes(phrase.toLowerCase())) {
            confidence += 30;
            indicators.push(`Title contains "${phrase}"`);
        }
    });
    
    // Check body content (with lower weight to avoid false positives)
    errorPhrases.forEach(phrase => {
        if (bodyText.includes(phrase.toLowerCase())) {
            confidence += 10;
            indicators.push(`Body contains "${phrase}"`);
        }
    });
    
    // Check URL patterns
    ['/404', '/error', '/notfound', '/page-not-found'].forEach(pattern => {
        if (urlLower.includes(pattern)) {
            confidence += 20;
            indicators.push(`URL contains "${pattern}"`);
        }
    });
    
    // Check meta tags
    const metaTags = document.getElementsByTagName('meta');
    for (let meta of metaTags) {
        const content = (meta.getAttribute('content') || '').toLowerCase();
        const name = (meta.getAttribute('name') || '').toLowerCase();
        
        if (name === 'prerender-status-code' && content === '404') {
            confidence += 50;
            indicators.push('Meta prerender-status-code is 404');
        }
        
        if (name === 'robots' && content.includes('noindex')) {
            confidence += 10;
            indicators.push('Meta robots includes noindex');
        }
    }
    
    // Check for common 404 page structures
    const h1Elements = document.getElementsByTagName('h1');
    for (let h1 of h1Elements) {
        const h1Text = h1.innerText.toLowerCase();
        errorPhrases.forEach(phrase => {
            if (h1Text.includes(phrase.toLowerCase())) {
                confidence += 25;
                indicators.push(`H1 contains "${phrase}"`);
            }
        });
    }
    
    // Cap confidence at 100
    confidence = Math.min(confidence, 100);
    
    // Consider it a 404 if confidence is above threshold
    const is404 = confidence >= 40;
    
    return {
        is404,
        confidence,
        indicators,
        url
    };
}

// Update extension badge with error count
async function updateBadge(tabId) {
    const errors = tabErrors.get(tabId) || [];
    const count = errors.length;
    
    if (count > 0) {
        await chrome.action.setBadgeText({
            text: count.toString(),
            tabId: tabId
        });
        
        await chrome.action.setBadgeBackgroundColor({
            color: '#FF0000',
            tabId: tabId
        });
    } else {
        await chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
    }
}

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
        
        console.log(`Stored 404 error: ${url}`);
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
        
        // Clear all badges
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.action.setBadgeText({ text: '', tabId: tab.id });
            });
        });
        
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'pageDetected404') {
        // Log 404 detection from content script
        console.log('[Background] 404 detected by content script:', request.url);
        // The content script will handle auto-search separately
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'checkAutoSearchEligibility') {
        checkAutoSearchEligibility(request.domain, request.url)
            .then(response => sendResponse(response))
            .catch(error => {
                console.error('Error in checkAutoSearchEligibility:', error);
                sendResponse({ shouldAutoSearch: false, reason: 'internal_error' });
            });
        return true; // Maintain the message channel open
    }

    if (request.action === 'generateSearchUrl') {
        try {
            const searchUrl = generateSearchUrl(request.url, request.title, request.searchEngine, request.queryTemplate);
            sendResponse({ success: true, searchUrl });
        } catch (error) {
            console.error('Error generating search URL:', error);
            sendResponse({ success: false });
        }
        return true;
    }

    if (request.action === 'createAutoSearchNotification') {
        createAutoSearchNotification(request.url, request.searchEngine, request.searchUrl)
            .then(notificationId => sendResponse({ success: true, notificationId }))
            .catch(error => {
                console.error('Error creating notification:', error);
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
        
        // Only allow auto-search if globally enabled (default true)
        if (settings.enableAutoSearch !== false) {
            // Respect blacklist
            if (isBlacklisted) {
                shouldAutoSearch = false;
            } else {
                shouldAutoSearch = true;
            }
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
        console.error('Error checking auto-search eligibility:', error);
        return { shouldAutoSearch: false, reason: 'error_retrieving_settings' };
    }
}

// Generate search URL based on configured templates
function generateSearchUrl(url, title, searchEngine = 'google', queryTemplate = 'domainAndKeywords') {
    try {
        const searchUrls = genSearchUrls(url, queryTemplate, title);
        const matchingEngine = searchUrls.find(su => su.engine.name.toLowerCase() === searchEngine.toLowerCase());
        return matchingEngine ? matchingEngine.url : null;
    } catch (error) {
        console.error('Error generating search URLs:', error);
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
        console.error('Error creating notification:', error);
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
console.log('404 Finder extension initialized');

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


