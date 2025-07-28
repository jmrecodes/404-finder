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

// JavaScript for 404 Finder: Auto-Search Redirector Options

/**
 * Load settings from Chrome storage and populate the UI
 */
function loadSettings() {
    chrome.storage.local.get(null, (settings) => {
        // Search Engine Settings
        document.getElementById('default-search-engine').value = settings.defaultSearchEngine || 'google';
        document.getElementById('default-query-template').value = settings.defaultQueryTemplate || 'domainAndKeywords';
        document.getElementById('enable-all-search-engines').checked = settings.enableAllSearchEngines !== false; // Default true
        
        // Auto-Search Settings
        document.getElementById('enable-auto-search').checked = settings.enableAutoSearch !== false; // Default true
        document.getElementById('show-auto-search-notifications').checked = settings.showAutoSearchNotifications !== false; // Default true

        // Domain Management
        loadDomainLists(settings);

        // Custom Search Settings
        document.getElementById('custom-search-url').value = settings.customSearchUrl || '';
        
        // Show/hide custom URL field based on search engine selection
        toggleCustomUrlField();
    });
}

/**
 * Save settings from the UI to Chrome storage
 */
function saveSettings() {
    const settings = {
        defaultSearchEngine: document.getElementById('default-search-engine').value,
        defaultQueryTemplate: document.getElementById('default-query-template').value,
        enableAllSearchEngines: document.getElementById('enable-all-search-engines').checked,
        enableAutoSearch: document.getElementById('enable-auto-search').checked,
        showAutoSearchNotifications: document.getElementById('show-auto-search-notifications').checked,
        customSearchUrl: document.getElementById('custom-search-url').value
    };

    chrome.storage.local.set(settings, () => {
        showStatus('Settings saved successfully!', true);
    });
}

/**
 * Load domain lists (whitelist and blacklist)
 *
 * @param {Object} settings - Settings object from storage
 */
function loadDomainLists(settings) {
    // Populate whitelist
    const whitelistContainer = document.getElementById('whitelist-container');
    
    if (!settings.whitelistDomains.length) {
        // Hide whitelist container
        whitelistContainer.style.display = 'none';
    } else {
        whitelistContainer.innerHTML = '';
        (settings.whitelistDomains || []).forEach(domain => {
            addDomainEntry(whitelistContainer, domain, true);
        });
    }

    // Populate blacklist
    const blacklistContainer = document.getElementById('blacklist-container');
    
    if (!settings.blacklistDomains.length) {
        // Hide blacklist container
        blacklistContainer.style.display = 'none';
    } else {
        blacklistContainer.innerHTML = '';
        (settings.blacklistDomains || []).forEach(domain => {
            addDomainEntry(blacklistContainer, domain, false);
        });
    }
}

/**
 * Add a domain entry to the domain list UI
 *
 * @param {HTMLElement} container - Container element for domain list
 * @param {string} domain - Domain to add
 * @param {boolean} isWhitelist - True if adding to whitelist, false for blacklist
 */
function addDomainEntry(container, domain, isWhitelist) {
    const entry = document.createElement('div');
    entry.className = 'domain-entry';
    entry.textContent = domain;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
        const key = isWhitelist ? 'whitelistDomains' : 'blacklistDomains';
        chrome.storage.local.get([key], (result) => {
            const domains = result[key] || [];
            const index = domains.indexOf(domain);
            if (index !== -1) {
                domains.splice(index, 1);
                chrome.storage.local.set({ [key]: domains }, () => {
                    container.removeChild(entry);
                });
            }
        });
    };
    entry.appendChild(removeBtn);
    container.appendChild(entry);
}

/**
 * Import settings from a JSON file
 */
function importSettings() {
    const fileInput = document.getElementById('import-file');
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    chrome.storage.local.set(importedSettings, () => {
                        showStatus('Settings imported successfully!', true);
                        loadSettings();
                    });
                } catch (error) {
                    showStatus('Failed to import settings: Invalid JSON format.', false);
                }
            };
            reader.readAsText(file);
        }
    };
    fileInput.click();
}

/**
 * Export current settings to a JSON file
 */
function exportSettings() {
    chrome.storage.local.get(null, (settings) => {
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const exportBtn = document.createElement('a');
        exportBtn.href = url;
        exportBtn.download = '404-finder-settings.json';
        exportBtn.click();
        URL.revokeObjectURL(url);
        showStatus('Settings exported successfully!', true);
    });
}

/**
 * Show a status message below the save/reset buttons
 *
 * @param {string} message - Status message to display
 * @param {boolean} isSuccess - True for success message, false for error
 */
function showStatus(message, isSuccess) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.style.color = isSuccess ? 'green' : 'red';
    setTimeout(() => { statusMessage.textContent = ''; }, 3000);
}

/**
 * Toggle visibility of custom URL field based on search engine selection
 */
function toggleCustomUrlField() {
    const searchEngine = document.getElementById('default-search-engine').value;
    const customUrlGroup = document.getElementById('settings-container');
    
    if (searchEngine === 'custom') {
        customUrlGroup.style.display = 'block';
        
        const customUrlInput = document.getElementById('custom-search-url');
        customUrlInput.focus();
    } else {
        customUrlGroup.style.display = 'none';
    }
}

// Event Listeners

document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('default-search-engine').addEventListener('change', toggleCustomUrlField);
document.getElementById('reset-settings').addEventListener('click', loadSettings);
document.getElementById('export-settings').addEventListener('click', exportSettings);
document.getElementById('import-settings').addEventListener('click', importSettings);

document.addEventListener('DOMContentLoaded', loadSettings);

document.getElementById('add-whitelist').addEventListener('click', () => addDomain('whitelist'));  // Event for adding whitelist domains
document.getElementById('add-blacklist').addEventListener('click', () => addDomain('blacklist'));  // Event for adding blacklist domains

// Bulk Add Modal Management
let currentBulkListType = null;

// Modal elements
const modal = document.getElementById('bulk-add-modal');
const modalTitle = document.getElementById('bulk-add-title');
const bulkDomainsInput = document.getElementById('bulk-domains-input');
const confirmBulkAdd = document.getElementById('confirm-bulk-add');
const cancelBulkAdd = document.getElementById('cancel-bulk-add');
const closeModal = modal.querySelector('.close');

// Bulk add event listeners
document.getElementById('bulk-add-whitelist').addEventListener('click', () => openBulkModal('whitelist'));
document.getElementById('bulk-add-blacklist').addEventListener('click', () => openBulkModal('blacklist'));
document.getElementById('clear-whitelist').addEventListener('click', () => clearDomainList('whitelist'));
document.getElementById('clear-blacklist').addEventListener('click', () => clearDomainList('blacklist'));

confirmBulkAdd.addEventListener('click', processBulkAdd);
cancelBulkAdd.addEventListener('click', closeBulkModal);
closeModal.addEventListener('click', closeBulkModal);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeBulkModal();
    }
});

/**
 * Open bulk add modal for specified list type
 * 
 * @param {string} listType - 'whitelist' or 'blacklist'
 */
function openBulkModal(listType) {
    currentBulkListType = listType;
    modalTitle.textContent = `Bulk Add ${listType.charAt(0).toUpperCase() + listType.slice(1)} Domains`;
    bulkDomainsInput.value = '';
    modal.style.display = 'block';
    bulkDomainsInput.focus();
}

/**
 * Close bulk add modal
 */
function closeBulkModal() {
    modal.style.display = 'none';
    currentBulkListType = null;
}

/**
 * Process bulk domain addition
 */
function processBulkAdd() {
    const domains = bulkDomainsInput.value
        .split('\n')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);
    
    if (domains.length === 0) {
        showStatus('Please enter at least one domain', false);
        return;
    }
    
    const isWhitelist = currentBulkListType === 'whitelist';
    const key = isWhitelist ? 'whitelistDomains' : 'blacklistDomains';
    
    chrome.storage.local.get([key], (result) => {
        const existingDomains = result[key] || [];
        const uniqueDomains = [...new Set([...existingDomains, ...domains])];
        
        chrome.storage.local.set({ [key]: uniqueDomains }, () => {
            // Check for Chrome runtime errors
            if (chrome.runtime.lastError) {
                showStatus(`Error saving domains: ${chrome.runtime.lastError.message}`, false);
                return;
            }
            
            showStatus(`Added ${domains.length} domains to ${currentBulkListType}`, true);
            // Reload all domain lists
            loadSettings();
            closeBulkModal();
        });
    });
}

/**
 * Clear all domains from specified list
 * 
 * @param {string} listType - 'whitelist' or 'blacklist'
 */
function clearDomainList(listType) {
    if (!confirm(`Are you sure you want to clear all ${listType} domains?`)) {
        return;
    }
    
    const isWhitelist = listType === 'whitelist';
    const key = isWhitelist ? 'whitelistDomains' : 'blacklistDomains';
    
    chrome.storage.local.set({ [key]: [] }, () => {
        if (chrome.runtime.lastError) {
            showStatus(`Error clearing ${listType}: ${chrome.runtime.lastError.message}`, false);
            return;
        }
        
        const container = document.getElementById(`${listType}-container`);
        container.innerHTML = '';
        showStatus(`${listType.charAt(0).toUpperCase() + listType.slice(1)} cleared`, true);
    });
}

/**
 * Validate domain format
 * 
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidDomain(domain) {
    // Simple validation for domain format
    const domainRegex = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain);
}

/**
 * Adding domain functionality
 *
 * @param {string} listType - "whitelist" or "blacklist"
 */
function addDomain(listType) {
    const inputId = listType === 'whitelist' ? 'whitelist-input' : 'blacklist-input';
    const input = document.getElementById(inputId);
    const domain = input.value.trim();
    if (domain) {
        const isWhitelist = (listType === 'whitelist');
        const containerId = isWhitelist ? 'whitelist-container' : 'blacklist-container';
        const container = document.getElementById(containerId);
        addDomainEntry(container, domain, isWhitelist);
        const key = isWhitelist ? 'whitelistDomains' : 'blacklistDomains';
        chrome.storage.local.get([key], (result) => {
            const domains = result[key] || [];
            if (!domains.includes(domain)) {
                domains.push(domain);
                chrome.storage.local.set({ [key]: domains });
            }
        });
        input.value = '';
    }
}

/**
 * Educational: Chrome Storage API Best Practices
 *
 * 1. **Storage Types**:
 *    - chrome.storage.local: Stores data locally on the device (up to 5MB)
 *    - chrome.storage.sync: Syncs data across devices when user is signed in (100KB total, 8KB per item)
 *    - chrome.storage.session: Stores data for the duration of the browser session
 *
 * 2. **Use Namespaces**: Organize settings into named objects to avoid global conflicts.
 *    Example: Instead of storing individual keys, group related settings:
 *    ```javascript
 *    // Bad
 *    chrome.storage.local.set({ 'theme': 'dark', 'fontSize': 14 });
 *    
 *    // Good
 *    chrome.storage.local.set({ 
 *        'appearance': { theme: 'dark', fontSize: 14 }
 *    });
 *    ```
 *
 * 3. **Avoid Excessive Writes**: Frequently writing to storage can impact performance.
 *    - Debounce frequent updates
 *    - Batch multiple changes together
 *    - Use a temporary in-memory cache for rapid changes
 *
 * 4. **Error Handling**: Always check for errors using chrome.runtime.lastError:
 *    ```javascript
 *    chrome.storage.local.set({ key: value }, () => {
 *        if (chrome.runtime.lastError) {
 *            console.error('Storage error:', chrome.runtime.lastError);
 *        }
 *    });
 *    ```
 *
 * 5. **Use Defaults**: Always specify defaults when loading to ensure smooth UX:
 *    ```javascript
 *    chrome.storage.local.get({ theme: 'light', fontSize: 12 }, (items) => {
 *        // items.theme and items.fontSize will have defaults if not set
 *    });
 *    ```
 *
 * 6. **Storage Limits**:
 *    - chrome.storage.local: 5MB total
 *    - chrome.storage.sync: 100KB total, 8KB per item, 512 items max
 *    - Monitor quota with: chrome.storage.local.getBytesInUse()
 *
 * 7. **Data Types**: Chrome storage can store any JSON-serializable data:
 *    - Strings, numbers, booleans, arrays, objects
 *    - Cannot store: Functions, Date objects (convert to strings), undefined
 *
 * 8. **Performance Tips**:
 *    - Use storage.get with specific keys instead of null when possible
 *    - Consider using IndexedDB for large datasets (>1MB)
 *    - Implement caching strategies for frequently accessed data
 *
 * 9. **Migration Strategies**:
 *    - Version your storage schema
 *    - Implement migration logic when schema changes
 *    - Always handle missing or outdated data gracefully
 *
 * 10. **Security Considerations**:
 *     - Never store sensitive data (passwords, tokens) in plain text
 *     - Be aware that storage is accessible to content scripts
 *     - Validate and sanitize data before storing
 */

/**
 * Reset settings to default values
 */
function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
        return;
    }
    
    const defaultSettings = {
        defaultSearchEngine: 'google',
        defaultQueryTemplate: 'domainAndKeywords',
        enableAllSearchEngines: true,  // Enable all search engines by default
        enableAutoSearch: true,  // Enable auto-search by default
        showAutoSearchNotifications: true,
        customSearchUrl: '',
        whitelistDomains: [],
        blacklistDomains: []  // Empty by default - all domains enabled
    };
    
    chrome.storage.local.clear(() => {
        chrome.storage.local.set(defaultSettings, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error resetting settings', false);
                return;
            }
            showStatus('Settings reset to defaults', true);
            loadSettings();
        });
    });
}

// Update reset button event listener
document.getElementById('reset-settings').removeEventListener('click', loadSettings);
document.getElementById('reset-settings').addEventListener('click', resetToDefaults);
