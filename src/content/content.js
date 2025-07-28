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
 * Content Script for 404 Finder: Auto-Search Redirector Extension
 * 
 * This script runs on every page and:
 * 1. Detects if the current page is a 404 error
 * 2. Communicates with the background script for decision making
 * 3. Implements auto-search functionality based on user settings
 * 
 * Educational: Content Script Isolation
 * - Content scripts run in an isolated world, separate from the page's JavaScript
 * - They can access and modify the DOM but cannot access page variables/functions
 * - Communication with background scripts happens via message passing
 * - Content scripts have access to a limited subset of Chrome APIs
 */

// Configuration constants for auto-search functionality
const AUTO_SEARCH_CONFIG = {
    // Minimum delay before auto-searching (prevents jarring immediate redirects)
    MIN_DELAY_MS: 3000,
    // Maximum delay before giving up on auto-search
    MAX_DELAY_MS: 10000
};

// List of common search engine domains to prevent redirect loops
const SEARCH_ENGINE_DOMAINS = [
    'google.com', 'www.google.com',
    'bing.com', 'www.bing.com',
    'yahoo.com', 'search.yahoo.com',
    'duckduckgo.com', 'www.duckduckgo.com',
    'baidu.com', 'www.baidu.com',
    'yandex.com', 'yandex.ru',
    'ask.com', 'www.ask.com',
    'aol.com', 'search.aol.com',
    'ecosia.org', 'www.ecosia.org',
    'startpage.com', 'www.startpage.com',
    'searx.me', 'qwant.com',
    'search.brave.com', 'neeva.com'
];

/**
 * Main initialization function - Entry point for content script
 * Runs when the page is fully loaded
 */
async function init() {
    console.log('[404 Finder] Content script initialized');
    
    // Check if this page appears to be a 404
    const is404 = await checkIf404Page();
    
    if (is404) {
        console.log('[404 Finder] 404 page detected');
        
        // Notify background script about the 404 detection
        chrome.runtime.sendMessage({
            action: 'pageDetected404',
            url: window.location.href,
            title: document.title
        });
        
        // Check if auto-search should be performed
        checkAutoSearchEligibility();
    }
}

/**
 * Check if the current page is a 404 error
 * This duplicates some logic from background.js but runs in the content script context
 * for immediate detection without requiring message passing
 * 
 * @returns {boolean} True if page appears to be a 404
 */
function checkIf404Page() {
    // Common 404 indicators
    const indicators = [
        '404', 'not found', 'page not found', 'file not found',
        'the page you requested', 'could not be found', 'does not exist',
        'page cannot be found', 'error 404', '404 error',
        "this content isn't available", // Facebook soft 404
        "temporarily blocked", // Other soft 404 cues
        "misusing this feature by going too fast",
        // Additional soft 404 patterns for various sites
        "this page isn't available", "the link you followed may be broken",
        "sorry, that page doesn't exist", "this account doesn't exist",
        "user not found", "profile not found", "content not found",
        "no longer available", "has been removed", "couldn't find",
        "unable to find", "we can't find", "nothing here",
        "oops", "dead link", "broken link"
    ];
    
    // Check title
    const titleLower = document.title.toLowerCase();
    for (const indicator of indicators) {
        if (titleLower.includes(indicator)) {
            return true;
        }
    }
    
    // Check main headings
    const headings = document.querySelectorAll('h1, h2');
    for (const heading of headings) {
        const headingText = heading.textContent.toLowerCase();
        for (const indicator of indicators) {
            if (headingText.includes(indicator)) {
                return true;
            }
        }
    }
    
    // Check meta tags
    const metaStatusCode = document.querySelector('meta[name="prerender-status-code"]');
    if (metaStatusCode && metaStatusCode.content === '404') {
        return true;
    }
    
    // Check URL patterns
    const urlLower = window.location.href.toLowerCase();
    const urlPatterns = ['/404', '/error', '/notfound', '/page-not-found'];
    for (const pattern of urlPatterns) {
        if (urlLower.includes(pattern)) {
            return true;
        }
    }
    
    // Check body text (with stricter matching to reduce false positives)
    const bodyText = document.body.textContent.toLowerCase();
    const strongIndicators = ['404 error', 'error 404', '404 - not found', 'http 404'];
    for (const indicator of strongIndicators) {
        if (bodyText.includes(indicator)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check if auto-search should be performed based on:
 * - User settings (global and per-domain)
 * - Domain whitelist/blacklist status
 * - Search engine domain check to prevent loops
 */
async function checkAutoSearchEligibility() {
    try {
        // Get current domain
        const domain = window.location.hostname;
        
        // Check if we're on a search engine domain to prevent redirect loops
        const isSearchEngine = SEARCH_ENGINE_DOMAINS.some(searchDomain => {
            return domain === searchDomain || domain.endsWith('.' + searchDomain);
        });
        
        if (isSearchEngine) {
            console.log('[404 Finder] Skipping auto-search on search engine domain:', domain);
            return;
        }
        
        // Request settings and domain status from background script
        const response = await chrome.runtime.sendMessage({
            action: 'checkAutoSearchEligibility',
            domain: domain,
            url: window.location.href
        });
        
        console.log('[404 Finder] Auto-search eligibility response:', response);
        
        if (response && response.shouldAutoSearch) {
            // Add delay to prevent jarring immediate redirects
            setTimeout(() => {
                performAutoSearch(response.searchEngine, response.queryTemplate);
            }, AUTO_SEARCH_CONFIG.MIN_DELAY_MS);
        } else {
            console.log('[404 Finder] Auto-search not enabled for this domain');
            if (response && response.reason) {
                console.log('[404 Finder] Reason:', response.reason);
            }
        }
    } catch (error) {
        console.error('[404 Finder] Error checking auto-search eligibility:', error);
    }
}


/**
 * Extract meaningful content from the page for better keyword generation
 * 
 * @returns {Object} Object containing page content and metadata
 */
function extractPageContent() {
    // Get clean page title without error messages
    let cleanTitle = document.title;
    
    // Remove common 404 error phrases from title
    const errorPhrases = ['404', 'not found', 'error', 'page not found', '- Not Found'];
    errorPhrases.forEach(phrase => {
        cleanTitle = cleanTitle.replace(new RegExp(phrase, 'gi'), '').trim();
    });
    
    // Extract meaningful content from meta tags
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // Try to extract the intended page topic from breadcrumbs
    const breadcrumbs = [];
    document.querySelectorAll('nav[aria-label="breadcrumb"] a, .breadcrumb a, [class*="breadcrumb"] a').forEach(link => {
        const text = link.textContent.trim();
        if (text && text.length > 1 && !text.match(/^(home|index)$/i)) {
            breadcrumbs.push(text);
        }
    });
    
    // Look for meaningful content in headings (excluding error messages)
    const headings = [];
    document.querySelectorAll('h1, h2, h3').forEach(heading => {
        const text = heading.textContent.trim();
        // Skip if it contains error indicators
        if (!text.match(/(404|error|not found|oops)/i) && text.length > 3) {
            headings.push(text);
        }
    });
    
    // Extract meaningful path segments from URL
    const pathSegments = window.location.pathname
        .split('/')
        .filter(segment => segment && segment.length > 2 && !segment.match(/^\d+$/));
    
    return {
        cleanTitle,
        metaDescription,
        metaKeywords,
        breadcrumbs: breadcrumbs.join(' '),
        headings: headings.join(' '),
        pathSegments: pathSegments.join(' ')
    };
}

/**
 * Perform the auto-search redirect
 * Generates search URL and redirects or opens new tab based on settings
 * 
 * @param {string} searchEngine - The search engine to use (e.g., 'google', 'bing')
 * @param {string} queryTemplate - The query template to use (e.g., 'domainAndKeywords')
 */
async function performAutoSearch(searchEngine, queryTemplate) {
    console.log('[404 Finder] Performing auto-search with:', searchEngine, queryTemplate);
    
    // Display notification before redirect
    displaySearchNotification(searchEngine);
    
    // Extract enhanced page content for better keywords
    const pageContent = extractPageContent();
    
    // Create enhanced title with all meaningful content
    const enhancedTitle = [
        pageContent.cleanTitle,
        pageContent.breadcrumbs,
        pageContent.headings,
        pageContent.metaKeywords,
        pageContent.pathSegments
    ].filter(content => content && content.length > 0).join(' ');
    
    // Request search URL from background script
    const response = await chrome.runtime.sendMessage({
        action: 'generateSearchUrl',
        url: window.location.href,
        title: enhancedTitle || document.title, // Fallback to original title if enhanced is empty
        searchEngine: searchEngine,
        queryTemplate: queryTemplate
    });
    
    if (response && response.searchUrl) {
        // Request to show notification before redirect
        chrome.runtime.sendMessage({
            action: 'createAutoSearchNotification',
            url: window.location.href,
            searchEngine: searchEngine,
            searchUrl: response.searchUrl
        }, (notificationResponse) => {
            if (notificationResponse && notificationResponse.success) {
                console.log('[404 Finder] Auto-search notification created');
            } else {
                console.error('[404 Finder] Failed to create notification:', notificationResponse?.error);
            }
        });

        // Small delay to allow user to see the notification
        setTimeout(() => {
            window.location.href = response.searchUrl;
        }, 2000); // Increase delay for better UX
    } else {
        console.error('[404 Finder] Failed to generate search URL');
    }
}

/**
 * Display a notification that auto-search is happening
 * 
 * @param {string} searchEngine - The search engine being used
 */
function displaySearchNotification(searchEngine) {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'error404-finder-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #001F3F;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 31, 63, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        animation: slideIn 0.3s ease-out;
        border: 2px solid #39CCCC;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
            <span>Searching for this page on ${searchEngine}...</span>
        </div>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
}


/**
 * Educational: Message Passing in Chrome Extensions
 * 
 * Content scripts communicate with background scripts using:
 * 1. chrome.runtime.sendMessage() - Send a message
 * 2. chrome.runtime.onMessage.addListener() - Receive messages
 * 
 * Messages are JSON-serializable objects. Common patterns:
 * - Include an 'action' field to identify message type
 * - Use promises with sendMessage for request-response patterns
 * - Always validate message data for security
 * 
 * Limitations:
 * - Messages are one-way (request-response requires separate messages)
 * - Large data transfers can impact performance
 * - Connection can be lost if background script restarts
 */

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Educational: Content Script Best Practices
 * 
 * 1. **Minimize Performance Impact**:
 *    - Only run expensive operations when necessary
 *    - Use passive event listeners when possible
 *    - Avoid modifying the DOM unless required
 * 
 * 2. **Handle Errors Gracefully**:
 *    - Wrap operations in try-catch blocks
 *    - Provide fallbacks for missing permissions
 *    - Log errors for debugging but don't break the page
 * 
 * 3. **Respect Page Functionality**:
 *    - Don't interfere with page's existing JavaScript
 *    - Use unique IDs/classes to avoid conflicts
 *    - Clean up event listeners and DOM modifications
 * 
 * 4. **Security Considerations**:
 *    - Never inject untrusted content into the page
 *    - Validate all data from message passing
 *    - Use Content Security Policy (CSP) safe methods
 * 
 * 5. **Storage and State**:
 *    - Use sessionStorage for temporary data
 *    - Clear sensitive data when done
 *    - Handle storage quota errors
 */
