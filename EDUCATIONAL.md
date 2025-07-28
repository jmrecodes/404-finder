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

Example snippet in `background.js`:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageDetected404') {
    // Handle the 404 detection
  }
});
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

### 6. Smart Query Generation

One of the most innovative features is the intelligent query generation system that creates relevant search queries from broken URLs:

#### URL Decoding and Cleaning
```javascript
function cleanUrlString(str) {
    try {
        // Decode URL encoding (handles %20, %2C, etc.)
        let decoded = decodeURIComponent(str);
        // Replace separators with spaces
        decoded = decoded.replace(/[\-_+]/g, ' ');
        return decoded.trim();
    } catch (e) {
        return str.replace(/[\-_+]/g, ' ').trim();
    }
}
```

#### Keyword Extraction Process
1. **Content Collection**: Gather text from multiple sources:
   - Page title (cleaned of error messages)
   - Meta descriptions and keywords
   - Breadcrumb navigation
   - Non-error headings (h1, h2, h3)
   - URL path segments

2. **Stop Word Filtering**: Remove common words that don't add search value:
   ```javascript
   const stopWords = ['the', 'is', 'at', 'which', 'on', ...];
   ```

3. **Smart Prioritization**: Keywords are ranked by relevance:
   - Domain name (if meaningful)
   - Title keywords (highest priority)
   - Path keywords (medium priority)
   - Query parameters (lowest priority)

#### Example Transformation
- **Input URL**: `youtube.com/watch?v=missing%20video%20link`
- **Processing Steps**:
  1. Decode: `missing%20video%20link` → `missing video link`
  2. Extract domain: `youtube`
  3. Extract path: `watch`
  4. Clean and prioritize: `["youtube", "watch", "missing", "video", "link"]`
- **Final Query**: `youtube watch missing video link`

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
