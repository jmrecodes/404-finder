# Creating a Chrome Extension: 404 Finder: Auto-Search Redirector

This educational guide walks through the development of the "404 Finder" Chrome extension, which automatically detects 404 errors and redirects users to intelligent search results. This guide is for developers new to Chrome extensions but familiar with web technologies.

## Overview

The "404 Finder" extension enhances web browsing by:
- Detecting both HTTP 404 errors and "soft" 404s (pages that return 200 but show error content)
- Generating smart search queries using advanced keyword extraction
- Supporting 10+ search engines with custom URL options
- Managing domain-specific behavior with whitelist/blacklist
- Providing a clean, modern UI with dark mode support

## Key Components

1. **Manifest V3 Configuration:** Modern Chrome extension setup
2. **Service Worker (Background):** Persistent event handling and 404 detection
3. **Content Scripts:** Page analysis and auto-search triggering
4. **Smart Query Generation:** URL decoding and keyword extraction
5. **User Interface:** Popup, options page, and toast notifications

## Step-by-Step Guide

### 1. Setting up the Manifest File

The `manifest.json` is the heart of any Chrome extension, containing metadata and configuration settings:

- **Manifest Version:** Use version 3 for modern Chrome extensions.
- **Permissions:** Request necessary permissions, like `tabs` and `storage`.
- **Background and Content Scripts:** Define which scripts to run in the background and on pages.
- **Action:** Configure the popup and icons for the extension.
- **Options Page and Icons:** Register the options page and extension icons.

```json
{
  "manifest_version": 3,
  "name": "404 Finder",
  "version": "1.0",
  "permissions": ["tabs", "storage", "notifications"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon.png"
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Content Script

Content scripts are JavaScript files that run in the context of web pages.

- **Isolation:** Content scripts operate in an isolated world, giving you access to a page's DOM but not its JavaScript variables.
- **Detection:** Create functions to detect 404 errors and soft 404s by examining page elements like titles and text content.
- **Messaging:** Send messages to the background script when a 404 is detected to trigger further actions.

Example code in `content.js`:

```javascript
async function init() {
  const is404 = await checkIf404Page();
  if (is404) {
    chrome.runtime.sendMessage({ action: 'pageDetected404', url: window.location.href });
  }
}

function checkIf404Page() {
  const indicators = [...]; // Define 404 indicators
  return indicators.some(indicator => document.body.textContent.includes(indicator));
}
```

### 3. Background Script

The background script runs continuously and listens for events triggered by the content script.

- **Event Listeners:** Respond to messages from content scripts by performing actions like generating search URLs.
- **Auto-Search Logic:** Use user settings to perform an auto-search when appropriate.
- **HTTP 404 Detection:** Monitors actual HTTP 404 status codes via `webRequest` API.
- **Architectural Note:** All soft 404 detection logic is contained in the content script to avoid code duplication.

Example snippet in `background.js`:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageDetected404') {
    // Store the 404 error detected by content script
    // Note: Detection logic is in content script only
  }
});

// Catch real HTTP 404s
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.statusCode === 404) {
      // Handle HTTP 404
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
```

### 4. Messaging

Communicate between content scripts and the background script using Chrome's messaging APIs:

- **`chrome.runtime.sendMessage`:** Sends messages.
- **`chrome.runtime.onMessage.addListener`:** Listens for incoming messages.

Ensure proper handling of asynchronous message passing for robust functionality.

### 5. User Interface Elements

#### Popup

Create an interactive popup that users see when they click on the extension icon:

- **Design with HTML/CSS:** Use HTML for structure and CSS for styling.
- **JavaScript for Interactivity:** Handle user interactions like button clicks to modify settings.

Example in `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>404 Finder</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <button id="searchButton">Search</button>
  <script src="popup.js"></script>
</body>
</html>
```

#### Options Page

Provide an options page for users to configure settings, like enabling auto-search or choosing search engines.

### 6. Simple Query Generation

The extension uses a simplified approach to generate search queries directly from the URL:

#### Direct URL-to-Query Transformation
```javascript
function extractSimpleQuery() {
    try {
        const url = new URL(window.location.href);
        
        // Extract domain name without TLD
        const domainParts = url.hostname.split('.');
        const domainName = domainParts[domainParts.length - 2] || domainParts[0] || '';
        
        // Decode and clean the pathname
        let pathQuery = decodeURIComponent(url.pathname)
            .replace(/^\//g, '') // Remove leading slash
            .replace(/\//g, ' ') // Replace slashes with spaces
            .replace(/[-_+]/g, ' ') // Replace separators with spaces
            .replace(/\.[^.]*$/, '') // Remove file extensions
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();
        
        // Combine domain name and path
        return `${domainName} ${pathQuery}`.trim();
    } catch (error) {
        return 'search';
    }
}
```

#### Example Transformations
- **GitHub**: `github.com/missing%20user%20test` → `github missing user test`
- **Facebook**: `facebook.com/invalid_url_not_found` → `facebook invalid url not found`  
- **Generic**: `site.com/an%20invalid%20url` → `site an invalid url`

#### Benefits of Simple Approach
1. **Predictable**: Users know exactly what will be searched
2. **Fast**: No complex content analysis needed
3. **Accurate**: Directly uses URL components without guessing
4. **Clean**: No unwanted navigation or UI elements in queries

### 7. Advanced Features

#### Dark Mode Support
The extension automatically adapts to the user's browser theme:
```css
@media (prefers-color-scheme: dark) {
    :root {
        --background: #202124;
        --text-primary: #E8EAED;
    }
}
```

#### Loop Prevention
To prevent infinite redirect loops, the extension checks if the current domain is a search engine:
```javascript
const SEARCH_ENGINE_DOMAINS = [
    'google.com', 'bing.com', 'duckduckgo.com', ...
];
```

### 8. Testing and Packaging

- **Test Scenarios**:
  - HTTP 404 pages
  - Soft 404s (200 status but error content)
  - Various URL encodings
  - Different languages and character sets
  - Search engine loop prevention

- **Package for Production**:
  1. Set `isProduction = true` in debugLogger.js
  2. Remove development console logs
  3. Minify JavaScript and CSS
  4. Create ZIP file for Chrome Web Store

## Key Learning Points

- **Chrome Extension Architecture**: Understand how service workers, content scripts, and popups communicate
- **Advanced DOM Analysis**: Learn techniques for detecting soft 404s through content analysis
- **Smart Text Processing**: Implement URL decoding, keyword extraction, and stop word filtering
- **User Experience Design**: Create responsive, theme-aware interfaces
- **Performance Optimization**: Handle large amounts of text processing efficiently

By following this guide, you'll create a sophisticated Chrome extension that not only detects errors but provides intelligent solutions through smart query generation and seamless user experience.
