# Creating a Chrome Extension: 404 Finder

This document will guide you through the creation process of the "404 Finder" Chrome extension, designed to detect 404 errors and perform auto-searches. This guide assumes you are a mid-level web developer with an understanding of HTML, JavaScript, and CSS, but are new to developing Chrome extensions.

## Overview

The "404 Finder" extension aims to enhance user experience by automatically searching for content on other sites when encountering 404 errors or similar frustrating webpage issues. This involves several key aspects:

1. **Manifest File:** Setting up the extension's configuration.
2. **Content Scripts:** Injecting JavaScript to run on specific web pages.
3. **Background Scripts:** Maintaining long-lasting processes to listen for events.
4. **Messaging:** Facilitating communication between scripts.
5. **User Interface Elements:** Building popups, options pages, and notifications.

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

### 6. Testing and Packaging

- **Test:** Use a test environment to mimic real-world scenarios and ensure detection and search logic work flawlessly.
- **Package:** Zip your extension files and prepare for submission to the Chrome Web Store.

## Key Learning Points

- Understand Chrome Extension architecture and how different scripts interact.
- Use Chrome-specific APIs for message passing and background tasks.
- Offer a user-friendly interface and configuration settings.

By following these steps, you can create a Chrome extension that not only detects 404 errors but also provides a helpful, user-friendly solution by automatically searching for the missing content.
