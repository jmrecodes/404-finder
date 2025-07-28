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
 
// Domain Manager for handling whitelist and blacklist
const storageKeyWhitelist = 'whitelistDomains';
const storageKeyBlacklist = 'blacklistDomains';

// Initialize storage if necessary
function initializeStorage() {
    chrome.storage.local.get([storageKeyWhitelist, storageKeyBlacklist], (result) => {
        if (!result[storageKeyWhitelist]) {
            chrome.storage.local.set({ [storageKeyWhitelist]: [] });
        }
        if (!result[storageKeyBlacklist]) {
            chrome.storage.local.set({ [storageKeyBlacklist]: [] });
        }
    });
}

// Regex escape utility function
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Add a domain to either whitelist or blacklist
function addDomain(domain, isWhitelist = true) {
    const key = isWhitelist ? storageKeyWhitelist : storageKeyBlacklist;
    chrome.storage.local.get([key], (result) => {
        const domains = result[key] || [];
        
        if (!domains.includes(domain)) {
            domains.push(domain);
            chrome.storage.local.set({ [key]: domains });
        }
    });
}

// Remove a domain from either whitelist or blacklist
function removeDomain(domain, isWhitelist = true) {
    const key = isWhitelist ? storageKeyWhitelist : storageKeyBlacklist;
    chrome.storage.local.get([key], (result) => {
        const domains = result[key] || [];
        const index = domains.indexOf(domain);
        
        if (index !== -1) {
            domains.splice(index, 1);
            chrome.storage.local.set({ [key]: domains });
        }
    });
}

// Check if a domain is in the whitelist/blacklist
function isDomainListed(domain, isWhitelist = true) {
    return new Promise((resolve) => {
        const key = isWhitelist ? storageKeyWhitelist : storageKeyBlacklist;
        chrome.storage.local.get([key], (result) => {
            const domains = result[key] || [];
            const regexList = domains.map(dom => new RegExp(`^${escapeRegex(dom).replace(/\\\.\\\*/g, '.*')}$`));
            resolve(regexList.some(regex => regex.test(domain)));
        });
    });
}

// Example Usage
// initializeStorage(); // Call this during extension start

// addDomain('example.com'); // Add to whitelist
// addDomain('*.example.net', false); // Add to blacklist

// removeDomain('example.com'); // Remove from whitelist
// removeDomain('*.example.net', false); // Remove from blacklist

// isDomainListed('sub.example.com').then(console.log); // Check whitelist
// isDomainListed('test.example.net', false).then(console.log); // Check blacklist

initializeStorage();

export {
    addDomain,
    removeDomain,
    isDomainListed
};
