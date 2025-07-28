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

// popup.js: Manages the popup UI and its interactions with background scripts.

// Import functions to manage domain whitelisting and blacklisting
import { addDomain, removeDomain, isDomainListed } from '../background/domainManager.js';
import { generateSearchUrls, extractUrlInfo } from '../search/searchEngineConfig.js';

// Elements for user interaction within the popup
const extensionToggle = document.getElementById('extensionToggle');
const statusIndicator = document.getElementById('statusIndicator');
const domainStatus = document.getElementById('domainStatus');
const currentDomainDisplay = document.getElementById('currentDomain');
const whitelistBtn = document.getElementById('whitelistBtn');
const blacklistBtn = document.getElementById('blacklistBtn');
const searchBtn = document.getElementById('searchBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Utility function to fetch the current domain from the active tab.
function getCurrentDomain() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      resolve(url.hostname);
    });
  });
}

// Update the popup UI to reflect the current active/inactive state of the extension.
function updateStatusIndicator(isActive) {
  if (isActive) {
    statusIndicator.classList.remove('inactive');
    statusIndicator.querySelector('.status-text').textContent = 'Active';
  } else {
    statusIndicator.classList.add('inactive');
    statusIndicator.querySelector('.status-text').textContent = 'Inactive';
  }
}

// Initialize the popup's state, adjusting the toggle and domain display based on stored settings.
function initializePopupState() {
  chrome.storage.local.get(['isExtensionActive'], (result) => {
    const isActive = result.isExtensionActive ?? true; // Default to active
    extensionToggle.checked = isActive;
    updateStatusIndicator(isActive);
  });

  getCurrentDomain().then((domain) => {
    currentDomainDisplay.textContent = domain;
    checkDomainStatus(domain);
  });
}

// Determine the status of the current domain and update the UI accordingly.
function checkDomainStatus(domain) {
  Promise.all([
    isDomainListed(domain, true),
    isDomainListed(domain, false),
    chrome.storage.local.get(['enableAutoSearch'])
  ]).then(([isWhitelisted, isBlacklisted, settings]) => {
    // Reset classes
    domainStatus.classList.remove('whitelisted', 'blacklisted');
    
    if (isWhitelisted) {
      domainStatus.textContent = 'Whitelisted';
      whitelistBtn.textContent = 'Remove from Whitelist';
      domainStatus.classList.add('whitelisted');
    } else if (isBlacklisted) {
      domainStatus.textContent = 'Blacklisted';
      blacklistBtn.textContent = 'Remove from Blacklist';
      domainStatus.classList.add('blacklisted');
    } else {
      // Check if auto-search is enabled globally
      const isAutoSearchEnabled = settings.enableAutoSearch !== false; // Default to true
      domainStatus.textContent = isAutoSearchEnabled ? 'Monitoring' : 'Not monitoring';
      domainStatus.classList.toggle('disabled', !isAutoSearchEnabled);
    }
  });
}

// Event listener to toggle the extension's active state.
extensionToggle.addEventListener('change', (event) => {
  const isActive = event.target.checked;
  chrome.storage.local.set({ isExtensionActive: isActive });
  updateStatusIndicator(isActive);
});

// Add the current domain to the whitelist upon button click.
whitelistBtn.addEventListener('click', async () => {
  const domain = await getCurrentDomain();
  const isWhitelisted = await isDomainListed(domain, true);
  
  if (isWhitelisted) {
    await removeDomain(domain, true);
    whitelistBtn.textContent = 'Whitelist';
  } else {
    await addDomain(domain, true);
    whitelistBtn.textContent = 'Remove from Whitelist';
  }

  await checkDomainStatus(domain);

  // Show visual feedback
  whitelistBtn.classList.add('success');
  setTimeout(() => {
    whitelistBtn.classList.remove('success');
  }, 2000);
});

// Add the current domain to the blacklist upon button click.
blacklistBtn.addEventListener('click', async () => {
  const domain = await getCurrentDomain();
  const isBlacklisted = await isDomainListed(domain, false);

  if (isBlacklisted) {
    await removeDomain(domain, false);
    blacklistBtn.textContent = 'Blacklist';
  } else {
    await addDomain(domain, false);
    blacklistBtn.textContent = 'Remove from Blacklist';
  }

  await checkDomainStatus(domain);

  // Show visual feedback
  blacklistBtn.classList.add('success');
  setTimeout(() => {
    blacklistBtn.classList.remove('success');
  }, 2000);
});

// Search for the current page on search engines
searchBtn.addEventListener('click', async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentTab = tabs[0];
    const url = currentTab.url;
    const title = currentTab.title || '';
    
    // Generate search URLs with the custom template
    const urlInfo = extractUrlInfo(url, title);
    
    // Use domainName which already extracts domain without extension
    const domainName = urlInfo.domainName;
    
    // Extract keywords from path (remove dashes)
    const pathKeywords = urlInfo.path
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => segment.replace(/-/g, ' '))
      .join(' ')
      .trim();
    
    // Create custom search query: domain keyword
    const searchQuery = `${domainName} ${pathKeywords}`.trim();
    
    // Open search in Google (you can add more search engines if needed)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    chrome.tabs.create({ url: searchUrl });
  });
});

// Open settings/options page
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize popup state when the popup is loaded.
initializePopupState();
