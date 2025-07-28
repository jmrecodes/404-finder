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
    // Skip detection on search engine domains entirely
    const currentDomain = window.location.hostname.toLowerCase();
    const isSearchEngine = SEARCH_ENGINE_DOMAINS.some(searchDomain => {
        return currentDomain === searchDomain || currentDomain.endsWith('.' + searchDomain);
    });
    
    if (isSearchEngine) {
        return;
    }
    
    // Check if this page appears to be a 404
    const is404 = await checkIf404Page();
    
    if (is404) {
        
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
 * Check if the current page is a 404 error using a sophisticated scoring system
 * Requires multiple strong indicators to prevent false positives
 * 
 * @returns {Object} Detection result with confidence score and details
 */
function checkIf404Page() {
    const detectionResult = {
        is404: false,
        confidence: 0,
        indicators: [],
        strongIndicators: 0,
        weakIndicators: 0
    };
    
    // Content analysis - crucial for detecting soft 404s
    const pageContent = document.body?.textContent || '';
    const words = pageContent.split(/\s+/).filter(word => word.length > 2);
    const wordCount = words.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const sentenceCount = (pageContent.match(/[.!?]+/g) || []).length;
    
    // Calculate content sparsity score
    let contentSparsityScore = 0;
    let sparsityMultiplier = 1.0;
    
    // Very short content is highly suspicious
    if (wordCount < 20) {
        contentSparsityScore = 35;
        sparsityMultiplier = 2.0; // Double the weight of pattern matches
        detectionResult.indicators.push(`Extremely sparse content: ${wordCount} words`);
    } else if (wordCount < 50) {
        contentSparsityScore = 25;
        sparsityMultiplier = 1.5;
        detectionResult.indicators.push(`Very sparse content: ${wordCount} words`);
    } else if (wordCount < 100) {
        contentSparsityScore = 15;
        sparsityMultiplier = 1.2;
        detectionResult.indicators.push(`Sparse content: ${wordCount} words`);
    } else if (wordCount < 200) {
        contentSparsityScore = 5;
        detectionResult.indicators.push(`Limited content: ${wordCount} words`);
    } else if (wordCount > 500) {
        // Substantial content reduces 404 likelihood
        contentSparsityScore = -20;
        sparsityMultiplier = 0.7; // Reduce pattern match weights
        detectionResult.indicators.push('Page has substantial content');
    }
    
    // Low unique word ratio suggests repetitive/templated content
    const uniqueWordRatio = uniqueWords / Math.max(wordCount, 1);
    if (wordCount > 10 && uniqueWordRatio < 0.5) {
        contentSparsityScore += 10;
        detectionResult.indicators.push('Low vocabulary diversity');
    }
    
    // Check sentence to word ratio (404 pages often have short, simple sentences)
    if (wordCount > 0 && sentenceCount > 0) {
        const wordsPerSentence = wordCount / sentenceCount;
        if (wordsPerSentence < 8) {
            contentSparsityScore += 10;
            detectionResult.indicators.push('Very short sentences');
        }
    }
    
    detectionResult.confidence += contentSparsityScore;
    
    // Get title and body text early
    const titleText = document.title || '';
    const bodyText = document.body?.textContent || '';
    
    // Platform-specific soft 404 patterns (high confidence for specific domains)
    const platformSpecific404s = [
        // GitHub
        {
            domain: 'github.com',
            patterns: [
                { pattern: /Page\s+not\s+found/i, weight: 40, context: 'title' },
                { pattern: /"404".*not.*the.*page.*you.*are.*looking.*for/i, weight: 50, context: 'any' },
                { pattern: /This\s+is\s+not\s+the\s+(web\s+)?page\s+you.*looking\s+for/i, weight: 40, context: 'any' }
            ]
        },
        // Facebook
        {
            domain: 'facebook.com',
            patterns: [
                { pattern: /This\s+content\s+isn[''']?t\s+available/i, weight: 40, context: 'any' },
                { pattern: /it[''']?s\s+been\s+deleted/i, weight: 30, context: 'any' },
                { pattern: /owner\s+only\s+shared\s+it\s+with\s+a\s+small\s+group/i, weight: 25, context: 'any' }
            ]
        },
        // Twitter/X
        {
            domain: 'twitter.com',
            patterns: [
                { pattern: /This\s+account\s+doesn'?t\s+exist/i, weight: 50, context: 'any' },
                { pattern: /Try\s+searching\s+for\s+another/i, weight: 20, context: 'any' }
            ]
        },
        {
            domain: 'x.com',
            patterns: [
                { pattern: /This\s+account\s+doesn'?t\s+exist/i, weight: 50, context: 'any' },
                { pattern: /Try\s+searching\s+for\s+another/i, weight: 20, context: 'any' }
            ]
        }
    ];
    
    // Check platform-specific patterns first
    const currentDomain = window.location.hostname.toLowerCase();
    for (const platform of platformSpecific404s) {
        if (currentDomain.includes(platform.domain)) {
            for (const pattern of platform.patterns) {
                // Check in title
                if ((pattern.context === 'title' || pattern.context === 'any') && pattern.pattern.test(titleText)) {
                    detectionResult.confidence += pattern.weight * sparsityMultiplier;
                    detectionResult.strongIndicators++;
                    detectionResult.indicators.push(`Platform-specific (${platform.domain}): ${pattern.pattern.source}`);
                }
                
                // Check in body
                if (pattern.context === 'any' && pattern.pattern.test(bodyText)) {
                    detectionResult.confidence += pattern.weight * 0.5 * sparsityMultiplier; // Half weight for body
                    detectionResult.indicators.push(`Platform-specific body (${platform.domain}): ${pattern.pattern.source}`);
                }
            }
        }
    }
    
    // Strong indicators (high confidence)
    const strongIndicators = [
        { pattern: /^404\s*[-–—]?\s*(error|not\s+found|page\s+not\s+found)/i, weight: 40, context: 'title' },
        { pattern: /^error\s+404/i, weight: 40, context: 'title' },
        { pattern: /Page\s+not\s+found/i, weight: 35, context: 'title' },
        { pattern: /HTTP\s+(ERROR\s+)?404/i, weight: 35, context: 'any' },
        { pattern: /404\s+File\s+or\s+directory\s+not\s+found/i, weight: 35, context: 'any' },
        { pattern: /The\s+requested\s+(URL|resource)\s+.*\s+was\s+not\s+found/i, weight: 30, context: 'any' },
        // GitHub style with quotes
        { pattern: /"404".*not.*the.*page.*you.*are.*looking.*for/i, weight: 40, context: 'any' },
        { pattern: /This\s+is\s+not\s+the\s+(web\s+)?page\s+you.*looking\s+for/i, weight: 35, context: 'any' }
    ];
    
    // Medium indicators
    const mediumIndicators = [
        { pattern: /page\s+(you([''']re|\s+are)\s+looking\s+for\s+)?(cannot\s+be\s+found|doesn[''']?t\s+exist)/i, weight: 20, context: 'any' },
        { pattern: /sorry[,.]?\s+(this|that)\s+page\s+(doesn[''']?t|does\s+not)\s+exist/i, weight: 20, context: 'any' },
        { pattern: /we\s+can[''']?t\s+find\s+(the\s+page|what)\s+you([''']?re)?\s+looking\s+for/i, weight: 20, context: 'any' },
        { pattern: /this\s+content\s+isn[''']?t\s+available/i, weight: 30, context: 'any' }, // Increased weight for Facebook
        { pattern: /page\s+has\s+been\s+(removed|deleted|moved)/i, weight: 15, context: 'any' },
        { pattern: /This\s+page\s+isn[''']?t\s+available/i, weight: 20, context: 'any' },
        // Facebook specific patterns
        { pattern: /it[''']?s\s+been\s+deleted/i, weight: 25, context: 'any' },
        { pattern: /owner\s+only\s+shared\s+it\s+with\s+a\s+small\s+group/i, weight: 20, context: 'any' }
    ];
    
    // Weak indicators (require multiple occurrences)
    const weakIndicators = [
        { pattern: /not\s+found/i, weight: 5, context: 'body' },
        { pattern: /doesn'?t\s+exist/i, weight: 5, context: 'body' },
        { pattern: /no\s+longer\s+available/i, weight: 5, context: 'body' },
        { pattern: /broken\s+link/i, weight: 5, context: 'body' },
        { pattern: /dead\s+link/i, weight: 5, context: 'body' }
    ];
    
    // Check strong indicators in title
    for (const indicator of strongIndicators) {
        if ((indicator.context === 'title' || indicator.context === 'any') && indicator.pattern.test(titleText)) {
            detectionResult.confidence += indicator.weight * sparsityMultiplier;
            detectionResult.strongIndicators++;
            detectionResult.indicators.push(`Title matches: ${indicator.pattern.source}`);
        }
    }
    
    // Check medium indicators in title with sparsity multiplier
    for (const indicator of mediumIndicators) {
        if ((indicator.context === 'title' || indicator.context === 'any') && indicator.pattern.test(titleText)) {
            detectionResult.confidence += indicator.weight * sparsityMultiplier;
            detectionResult.indicators.push(`Title matches (medium): ${indicator.pattern.source}`);
        }
    }
    
    // Check H1 tags (primary headings are important)
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
        const h1Text = h1.textContent || '';
        
        // Check all indicators in H1
        for (const indicators of [strongIndicators, mediumIndicators]) {
            for (const indicator of indicators) {
                if (indicator.context === 'any' && indicator.pattern.test(h1Text)) {
                    const adjustedWeight = indicator.weight * 0.8 * sparsityMultiplier;
                    detectionResult.confidence += adjustedWeight;
                    if (indicators === strongIndicators) {
                        detectionResult.strongIndicators++;
                    }
                    detectionResult.indicators.push(`H1 matches: ${indicator.pattern.source}`);
                }
            }
        }
    }
    
    // Check meta tags
    const metaStatusCode = document.querySelector('meta[name="prerender-status-code"]');
    if (metaStatusCode && metaStatusCode.content === '404') {
        detectionResult.confidence += 50;
        detectionResult.strongIndicators++;
        detectionResult.indicators.push('Meta prerender-status-code is 404');
    }
    
    // Check HTTP status meta tag
    const metaHttpStatus = document.querySelector('meta[http-equiv="status"]');
    if (metaHttpStatus && metaHttpStatus.content === '404') {
        detectionResult.confidence += 50;
        detectionResult.strongIndicators++;
        detectionResult.indicators.push('Meta http-equiv status is 404');
    }
    
    // Check URL patterns
    const urlLower = window.location.href.toLowerCase();
    const urlPatterns = [
        { pattern: /\/404(\.html?)?$/i, weight: 30 },
        { pattern: /\/error\/404/i, weight: 30 },
        { pattern: /\/not[-_]?found/i, weight: 20 },
        { pattern: /\/page[-_]?not[-_]?found/i, weight: 25 }
    ];
    
    for (const urlPattern of urlPatterns) {
        if (urlPattern.pattern.test(urlLower)) {
            detectionResult.confidence += urlPattern.weight;
            detectionResult.indicators.push(`URL matches: ${urlPattern.pattern.source}`);
        }
    }
    
    // Count weak indicators in body
    let weakIndicatorCount = 0;
    for (const indicator of weakIndicators) {
        const matches = bodyText.match(indicator.pattern);
        if (matches && matches.length > 0) {
            weakIndicatorCount++;
            detectionResult.weakIndicators++;
        }
    }
    
    // Only add confidence from weak indicators if multiple are found
    if (weakIndicatorCount >= 3) {
        detectionResult.confidence += weakIndicatorCount * 3;
        detectionResult.indicators.push(`Multiple weak indicators found: ${weakIndicatorCount}`);
    }
    
    // Check for strong patterns in body with adjusted weights
    for (const indicator of strongIndicators.concat(mediumIndicators)) {
        if (indicator.context === 'any' && indicator.pattern.test(bodyText)) {
            // Adjust body weight based on content sparsity
            let bodyWeight = 0.3; // Default low weight
            if (wordCount < 100) {
                bodyWeight = 0.6; // Higher weight for sparse pages
            } else if (wordCount < 200) {
                bodyWeight = 0.4;
            }
            detectionResult.confidence += indicator.weight * bodyWeight * sparsityMultiplier;
            detectionResult.indicators.push(`Body matches: ${indicator.pattern.source}`);
        }
    }
    
    // Page structure analysis
    const images = document.querySelectorAll('img');
    const links = document.querySelectorAll('a');
    const forms = document.querySelectorAll('form');
    
    // Special handling for known sites with complex navigation
    const isKnownSite = ['github.com', 'facebook.com', 'twitter.com', 'x.com']
        .some(domain => currentDomain.includes(domain));
    
    // 404 pages typically have minimal content (but adjust for sites with nav chrome)
    if (!isKnownSite && images.length <= 2 && links.length <= 10 && forms.length === 0) {
        detectionResult.confidence += 10;
        detectionResult.indicators.push('Minimal page structure');
    } else if (isKnownSite && wordCount < 100) {
        // For known sites, focus on content sparsity rather than structure
        detectionResult.confidence += 5;
        detectionResult.indicators.push('Known site with sparse content');
    }
    
    // Check for common 404 page elements
    const has404Image = Array.from(images).some(img => 
        img.src.toLowerCase().includes('404') || 
        img.alt.toLowerCase().includes('404')
    );
    
    if (has404Image) {
        detectionResult.confidence += 20;
        detectionResult.indicators.push('404 image found');
    }
    
    // Final determination - adjust thresholds based on content sparsity
    let confidenceThreshold = 60;
    let strongIndicatorRequirement = 1;
    
    // Adjust thresholds based on content
    if (wordCount < 20) {
        // Very likely a 404 if it has minimal content AND any error indicators
        confidenceThreshold = 45;
        strongIndicatorRequirement = 0; // Even medium indicators are enough
    } else if (wordCount < 50) {
        confidenceThreshold = 50;
        strongIndicatorRequirement = 0;
    } else if (wordCount < 100) {
        confidenceThreshold = 55;
    } else if (wordCount < 200) {
        confidenceThreshold = 58;
    }
    
    // Special handling for pages with strong 404 signals
    const hasExplicit404 = bodyText.includes('404') || titleText.includes('404');
    const hasMultipleIndicators = detectionResult.indicators.length >= 3;
    
    // Check for platform-specific detection
    let platformDetected = false;
    for (const platform of platformSpecific404s) {
        if (currentDomain.includes(platform.domain)) {
            // Check if we matched any platform-specific patterns
            const platformIndicators = detectionResult.indicators.filter(ind => 
                ind.includes(`Platform-specific (${platform.domain})`) || 
                ind.includes(`Platform-specific body (${platform.domain})`)
            );
            if (platformIndicators.length > 0) {
                platformDetected = true;
                break;
            }
        }
    }
    
    // Detection logic
    if (detectionResult.confidence >= 80) {
        // Very high confidence always means 404
        detectionResult.is404 = true;
    } else if (hasExplicit404 && detectionResult.confidence >= 40) {
        // Pages with explicit "404" need lower threshold
        detectionResult.is404 = true;
    } else if (platformDetected) {
        // Special handling for known platforms with heavy chrome
        if (currentDomain.includes('facebook.com') && detectionResult.confidence >= 35) {
            // Facebook loads tons of nav/footer even on 404s
            detectionResult.is404 = true;
        } else if (detectionResult.confidence >= 45) {
            // Other platforms need slightly higher confidence
            detectionResult.is404 = true;
        }
    } else if (wordCount < 100 && detectionResult.confidence >= confidenceThreshold) {
        // Sparse pages only need to meet confidence threshold
        detectionResult.is404 = true;
    } else if (hasMultipleIndicators && detectionResult.confidence >= confidenceThreshold - 5) {
        // Multiple indicators can slightly lower the threshold
        detectionResult.is404 = true;
    } else {
        // Standard detection: require both confidence and strong indicators
        detectionResult.is404 = detectionResult.confidence >= confidenceThreshold && 
                                 detectionResult.strongIndicators >= strongIndicatorRequirement;
    }
    
    return detectionResult.is404;
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
            return;
        }
        
        // Request settings and domain status from background script
        const response = await chrome.runtime.sendMessage({
            action: 'checkAutoSearchEligibility',
            domain: domain,
            url: window.location.href
        });
        
        if (response && response.shouldAutoSearch) {
            // Add delay to prevent jarring immediate redirects
            setTimeout(() => {
                performAutoSearch(response.searchEngine, response.queryTemplate);
            }, AUTO_SEARCH_CONFIG.MIN_DELAY_MS);
        }
    } catch (error) {
        // Silent fail - auto-search is not critical
    }
}


/**
 * Extract query from URL - Simple and direct approach
 * Uses only the last path segment as it typically contains the most relevant identifier
 * Example: site.com/posts/category/invalid-title -> "site invalid title"
 * 
 * @returns {string} Simple search query from URL components
 */
function extractSimpleQuery() {
    try {
        const url = new URL(window.location.href);
        
        // Extract domain name without TLD (e.g., 'github' from 'github.com')
        const domainParts = url.hostname.split('.');
        const domainName = domainParts[domainParts.length - 2] || domainParts[0] || '';
        
        // Get only the last segment of the path
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
        const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        
        // Decode and clean the last segment
        let pathQuery = decodeURIComponent(lastSegment)
            .replace(/[-_+]/g, ' ') // Replace separators with spaces
            .replace(/\.[^.]*$/, '') // Remove file extensions
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();
        
        // Combine domain name and last path segment
        const query = [domainName, pathQuery]
            .filter(part => part && part.length > 0)
            .join(' ');
        
        return query || domainName || 'search';
    } catch (error) {
        return 'search';
    }
}

/**
 * Perform the auto-search redirect
 * Generates search URL and redirects or opens new tab based on settings
 * 
 * @param {string} searchEngine - The search engine to use (e.g., 'google', 'bing')
 * @param {string} queryTemplate - The query template to use (e.g., 'domainAndKeywords')
 */
async function performAutoSearch(searchEngine, queryTemplate) {
    // Display notification before redirect
    displaySearchNotification(searchEngine);
    
    // Use simple query extraction from URL
    const simpleQuery = extractSimpleQuery();
    
    // Request search URL from background script
    const response = await chrome.runtime.sendMessage({
        action: 'generateSearchUrl',
        url: window.location.href,
        title: simpleQuery, // Use simple query instead of complex extraction
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
            // Silent handling - notifications are non-critical
        });

        // Small delay to allow user to see the notification
        setTimeout(() => {
            window.location.href = response.searchUrl;
        }, 2000); // Increase delay for better UX
    } else {
        // Silent fail - search redirect failed
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
