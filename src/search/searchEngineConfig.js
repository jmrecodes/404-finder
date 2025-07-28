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
 * Search Engine Configuration Module
 * 
 * This module provides configuration and URL construction for various search engines
 * to help users find alternative resources when encountering 404 errors.
 * 
 * Educational: Search Engine URL Parameters
 * - Google: Uses 'q' parameter for queries, supports advanced operators like 'site:'
 * - Bing: Uses 'q' parameter similar to Google, supports similar operators
 * - DuckDuckGo: Uses 'q' parameter, privacy-focused, doesn't track users
 */

import logger from '../utils/debugLogger.js';

/**
 * Search engine configurations
 * Each engine has:
 * - name: Display name
 * - baseUrl: The search URL without query parameters
 * - queryParam: The URL parameter name for the search query
 * - icon: Icon identifier for UI display
 * - description: User-friendly description
 */
export const SEARCH_ENGINES = {
    google: {
        name: 'Google',
        baseUrl: 'https://www.google.com/search',
        queryParam: 'q',
        icon: 'google',
        description: 'Search with Google'
    },
    bing: {
        name: 'Bing',
        baseUrl: 'https://www.bing.com/search',
        queryParam: 'q',
        icon: 'bing',
        description: 'Search with Microsoft Bing'
    },
    duckduckgo: {
        name: 'DuckDuckGo',
        baseUrl: 'https://duckduckgo.com/',
        queryParam: 'q',
        icon: 'duckduckgo',
        description: 'Search privately with DuckDuckGo'
    },
    yahoo: {
        name: 'Yahoo',
        baseUrl: 'https://search.yahoo.com/search',
        queryParam: 'p',
        icon: 'yahoo',
        description: 'Search with Yahoo'
    },
    yandex: {
        name: 'Yandex',
        baseUrl: 'https://yandex.com/search/',
        queryParam: 'text',
        icon: 'yandex',
        description: 'Search with Yandex'
    },
    baidu: {
        name: 'Baidu',
        baseUrl: 'https://www.baidu.com/s',
        queryParam: 'wd',
        icon: 'baidu',
        description: 'Search with Baidu'
    },
    startpage: {
        name: 'Startpage',
        baseUrl: 'https://www.startpage.com/sp/search',
        queryParam: 'q',
        icon: 'startpage',
        description: 'Private search with Startpage'
    },
    searx: {
        name: 'Searx',
        baseUrl: 'https://searx.be/',
        queryParam: 'q',
        icon: 'searx',
        description: 'Metasearch with Searx'
    },
    qwant: {
        name: 'Qwant',
        baseUrl: 'https://www.qwant.com/',
        queryParam: 'q',
        icon: 'qwant',
        description: 'Search with Qwant'
    },
    ecosia: {
        name: 'Ecosia',
        baseUrl: 'https://www.ecosia.org/search',
        queryParam: 'q',
        icon: 'ecosia',
        description: 'Search and plant trees with Ecosia'
    }
};

/**
 * Search query templates
 * These templates define how to construct search queries based on the failed URL
 * 
 * Educational: Search Query Templates
 * - site: Limits search to a specific domain (e.g., "site:example.com keyword")
 * - intitle: Searches for pages with specific words in the title
 * - inurl: Searches for pages with specific words in the URL
 * - cache: Shows Google's cached version of a page (Google only)
 * - related: Finds sites similar to a specified site (Google only)
 */
export const QUERY_TEMPLATES = {
    // Default template - searches for domain and keywords from other sites
    domainAndKeywords: {
        name: 'Domain + Keywords',
        description: 'Search for the domain name and page keywords across the web',
        tooltip: 'Searches for pages mentioning this domain and related keywords from any website. Useful for finding discussions, alternatives, or cached versions.',
        construct: (urlInfo) => {
            const { domainName, keywords } = urlInfo;
            const filteredKeywords = keywords.filter(kw => kw !== domainName);
            return `${domainName} ${filteredKeywords.join(' ')}`.trim();
        },
        isDefault: true
    },
    
    // Site-specific search
    siteSpecific: {
        name: 'Site-specific Search',
        description: 'Search only within the same domain',
        tooltip: 'Limits search to pages within the same website. Useful for finding moved or renamed pages on the same site.',
        construct: (urlInfo) => {
            const { domain, keywords } = urlInfo;
            return `site:${domain} ${keywords.join(' ')}`;
        },
        isDefault: false
    },
    
    // Cached version search
    cachedVersion: {
        name: 'Cached Version',
        description: 'Look for cached or archived versions',
        tooltip: 'Searches for cached or archived versions of the page. May show older content that\'s no longer available.',
        construct: (urlInfo) => {
            const { fullUrl, domain } = urlInfo;
            return `cache:${fullUrl} OR "archive.org" ${domain}`;
        },
        isDefault: false,
        supportedEngines: ['google'] // Some templates work better with specific engines
    },
    
    // Similar pages search
    similarPages: {
        name: 'Similar Pages',
        description: 'Find pages with similar content',
        tooltip: 'Searches for pages with similar topics or content. Helps find alternative resources.',
        construct: (urlInfo) => {
            const { keywords, title } = urlInfo;
            const searchTerms = title ? [title, ...keywords] : keywords;
            return searchTerms.join(' ') + ' -site:' + urlInfo.domain;
        },
        isDefault: false
    },
    
    // Technical documentation search
    technicalDocs: {
        name: 'Technical Docs',
        description: 'Search in documentation sites',
        tooltip: 'Searches popular documentation sites for technical content. Best for API docs, guides, and tutorials.',
        construct: (urlInfo) => {
            const { keywords } = urlInfo;
            const docSites = ['stackoverflow.com', 'github.com', 'developer.mozilla.org', 'medium.com'];
            const siteQuery = docSites.map(site => `site:${site}`).join(' OR ');
            return `(${siteQuery}) ${keywords.join(' ')}`;
        },
        isDefault: false
    }
};

/**
 * Clean and decode a URL-encoded string
 * 
 * @param {string} str - The string to clean
 * @returns {string} Cleaned string
 */
function cleanUrlString(str) {
    try {
        // Decode URL encoding (handles %20, %2C, etc.)
        let decoded = decodeURIComponent(str);
        
        // Replace common URL separators with spaces
        decoded = decoded.replace(/[\-_+]/g, ' ');
        
        // Remove multiple spaces
        decoded = decoded.replace(/\s+/g, ' ');
        
        // Trim whitespace
        return decoded.trim();
    } catch (e) {
        // If decoding fails, return original string cleaned
        return str.replace(/[\-_+]/g, ' ').replace(/\s+/g, ' ').trim();
    }
}

/**
 * Extract meaningful keywords from text, prioritizing quality over quantity
 * 
 * @param {string} text - The text to extract keywords from
 * @param {Array} stopWords - Words to exclude
 * @returns {Array} Array of keywords
 */
function extractMeaningfulKeywords(text, stopWords = []) {
    if (!text) return [];
    
    // Common stop words to filter out
    const defaultStopWords = [
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
        'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
        'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
        'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
        'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
        'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
        'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
        'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
        'were', 'been', 'have', 'their', 'said', 'each', 'she', 'which', 'do',
        'www', 'com', 'org', 'net', 'html', 'htm', 'php', 'asp', 'jsp'
    ];
    
    const allStopWords = new Set([...defaultStopWords, ...stopWords]);
    
    // Split text into words and clean them
    const words = text
        .toLowerCase()
        .split(/[\s\-_\|:\/\.\,\;\!\?\(\)\[\]\{\}"']+/)
        .map(word => word.trim())
        .filter(word => {
            // Keep words that are:
            // - Longer than 2 characters
            // - Not just numbers
            // - Not in stop words
            // - Not empty
            return word.length > 2 && 
                   !/^\d+$/.test(word) && 
                   !allStopWords.has(word) &&
                   word !== '';
        });
    
    // Remove duplicates while preserving order
    return [...new Set(words)];
}

/**
 * Extract information from a URL for search query construction
 * 
 * @param {string} url - The failed URL
 * @param {string} pageTitle - The page title if available
 * @returns {Object} URL information including domain, path, keywords, etc.
 */
export function extractUrlInfo(url, pageTitle = '') {
    // Start performance monitoring
    logger.startTimer('extractUrlInfo', { url, hasTitle: !!pageTitle });
    
    try {
        const urlObj = new URL(url);
        
        // Extract domain without subdomain for broader search
        const domain = urlObj.hostname;
        const domainParts = domain.split('.');
        const mainDomain = domainParts.slice(-2).join('.');
        
        // Extract domain name without extension (e.g., 'google' from 'google.com')
        const domainName = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domainParts[0] || '';
        
        // Clean and decode the pathname
        const cleanedPath = cleanUrlString(urlObj.pathname);
        
        // Extract keywords from cleaned path
        const pathKeywords = extractMeaningfulKeywords(cleanedPath);
        
        // Extract and clean keywords from query parameters
        const queryKeywords = [];
        urlObj.searchParams.forEach((value, key) => {
            // Clean both key and value
            const cleanKey = cleanUrlString(key);
            const cleanValue = cleanUrlString(value);
            
            // Extract meaningful keywords from both
            queryKeywords.push(...extractMeaningfulKeywords(cleanKey));
            queryKeywords.push(...extractMeaningfulKeywords(cleanValue));
        });
        
        // Error-related words to exclude from title
        const errorWords = ['404', 'not', 'found', 'error', 'page', 'cannot', 'exist', 'available', 'blocked', 'denied'];
        
        // Clean and extract keywords from title
        const cleanedTitle = cleanUrlString(pageTitle);
        const titleKeywords = extractMeaningfulKeywords(cleanedTitle, errorWords);
        
        // Smart keyword prioritization
        // 1. Title keywords are often most relevant
        // 2. Path keywords are second priority  
        // 3. Query parameters are third priority
        const prioritizedKeywords = [];
        
        // Add domain name if it's meaningful (not in common words)
        if (domainName && domainName.length > 3 && domainName !== 'www') {
            prioritizedKeywords.push(domainName);
        }
        
        // Add title keywords first (most relevant)
        prioritizedKeywords.push(...titleKeywords.slice(0, 3));
        
        // Add path keywords
        prioritizedKeywords.push(...pathKeywords.slice(0, 2));
        
        // Add query keywords
        prioritizedKeywords.push(...queryKeywords.slice(0, 2));
        
        // Remove duplicates while preserving order
        const uniqueKeywords = [...new Set(prioritizedKeywords)];
        
        const result = {
            fullUrl: url,
            domain: domain,
            mainDomain: mainDomain,
            domainName: domainName,
            path: urlObj.pathname,
            keywords: uniqueKeywords.slice(0, 5), // Limit to 5 most relevant keywords
            title: pageTitle
        };
        
        // End performance monitoring with success
        logger.endTimer('extractUrlInfo', { 
            keywordCount: result.keywords.length,
            success: true 
        });
        
        return result;
    } catch (error) {
        logger.error('Error extracting URL info:', { error, url });
        
        // End performance monitoring with failure
        logger.endTimer('extractUrlInfo', { 
            success: false,
            error: error.message 
        });
        
        return {
            fullUrl: url,
            domain: '',
            mainDomain: '',
            domainName: '',
            path: '',
            keywords: [],
            title: pageTitle
        };
    }
}

/**
 * Construct a search URL for a given search engine and query
 * 
 * @param {string} engineKey - Key of the search engine (google, bing, duckduckgo)
 * @param {string} query - The search query
 * @returns {string} The complete search URL
 */
export function constructSearchUrl(engineKey, query) {
    const engine = SEARCH_ENGINES[engineKey];
    if (!engine) {
        throw new Error(`Unknown search engine: ${engineKey}`);
    }
    
    // URL encode the query
    const encodedQuery = encodeURIComponent(query);
    
    // Construct the full URL
    const url = `${engine.baseUrl}?${engine.queryParam}=${encodedQuery}`;
    
    // Add any engine-specific parameters
    const additionalParams = getEngineSpecificParams(engineKey);
    
    return additionalParams ? `${url}&${additionalParams}` : url;
}

/**
 * Get engine-specific URL parameters
 * 
 * Educational: Engine-specific parameters
 * - Google: 'hl' for language, 'safe' for safe search, 'num' for results count
 * - Bing: 'cc' for country code, 'setlang' for language
 * - DuckDuckGo: 'kl' for region, 'kp' for safe search
 * 
 * @param {string} engineKey - Key of the search engine
 * @returns {string} Additional URL parameters
 */
function getEngineSpecificParams(engineKey) {
    switch (engineKey) {
        case 'google':
            // Example: hl=en for English, num=20 for 20 results
            return 'hl=en&num=20';
        case 'bing':
            // Example: cc=us for US results
            return 'cc=us';
        case 'duckduckgo':
            // Example: kl=us-en for US English results
            return 'kl=us-en';
        default:
            return '';
    }
}

/**
 * Generate search URLs for all configured search engines
 * 
 * @param {string} url - The failed URL
 * @param {string} templateKey - The query template to use
 * @param {string} pageTitle - The page title if available
 * @returns {Array} Array of search URL objects
 */
export function generateSearchUrls(url, templateKey = 'domainAndKeywords', pageTitle = '') {
    // Start performance monitoring for the entire operation
    logger.startTimer('generateSearchUrls', { 
        url, 
        templateKey, 
        hasTitle: !!pageTitle 
    });
    
    const urlInfo = extractUrlInfo(url, pageTitle);
    const template = QUERY_TEMPLATES[templateKey];
    
    if (!template) {
        throw new Error(`Unknown query template: ${templateKey}`);
    }
    
    const query = template.construct(urlInfo);
    const searchUrls = [];
    
    // Generate URLs for each search engine
    Object.keys(SEARCH_ENGINES).forEach(engineKey => {
        // Check if template is supported by this engine
        if (template.supportedEngines && !template.supportedEngines.includes(engineKey)) {
            return;
        }
        
        try {
            const searchUrl = constructSearchUrl(engineKey, query);
            searchUrls.push({
                engine: SEARCH_ENGINES[engineKey],
                url: searchUrl,
                query: query
            });
        } catch (error) {
            logger.error(`Error generating search URL for ${engineKey}:`, { error, engineKey });
        }
    });
    
    // End performance monitoring
    logger.endTimer('generateSearchUrls', { 
        urlCount: searchUrls.length,
        queryLength: query.length,
        success: searchUrls.length > 0
    });
    
    return searchUrls;
}

/**
 * Get the default query template key
 * 
 * @returns {string} The key of the default template
 */
export function getDefaultTemplate() {
    const defaultTemplate = Object.keys(QUERY_TEMPLATES).find(
        key => QUERY_TEMPLATES[key].isDefault
    );
    return defaultTemplate || 'domainAndKeywords';
}

/**
 * Educational: How Search Engines Process Queries
 * 
 * 1. Query Parsing: Search engines parse queries to identify:
 *    - Keywords: Regular search terms
 *    - Operators: Special commands like site:, intitle:, etc.
 *    - Phrases: Terms in quotes are searched as exact phrases
 * 
 * 2. Query Expansion: Engines may:
 *    - Add synonyms
 *    - Correct spelling
 *    - Understand intent
 * 
 * 3. Ranking Factors:
 *    - Relevance: How well content matches the query
 *    - Authority: Domain reputation and backlinks
 *    - Freshness: How recent the content is
 *    - User signals: Click-through rates, dwell time
 * 
 * 4. Personalization:
 *    - Location-based results
 *    - Search history
 *    - Language preferences
 * 
 * Note: DuckDuckGo doesn't personalize results, making it good for neutral searches
 */
