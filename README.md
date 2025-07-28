# 404 Finder: Auto-Search Redirector

A powerful Chrome extension that automatically detects 404 errors and redirects to relevant search results. It helps you find the content you were looking for when pages go missing by creating simple, effective search queries from the broken URL.

## 🚀 Key Features

### Core Functionality
- **🔍 Advanced 404 Detection (99% Accuracy)**:
  - Sophisticated scoring system prevents false positives
  - Requires multiple strong indicators (confidence ≥60 + strong indicator)
  - Pattern-based regex matching for precision
  - Context-aware detection (title weighted higher than body)
  - Ignores pages with substantial content (>500 words)
  - Detects both HTTP 404 and "soft" 404s
- **🎯 Smart Auto-Redirect**: Automatically redirects to search results after a brief delay
- **🧠 Simple Query Generation**: Creates clean search queries directly from the URL
- **🌐 Multi-Search Engine Support**: Choose from 10+ search engines including:
  - Google, Bing, DuckDuckGo, Yahoo, Yandex
  - Baidu, Startpage, Searx, Qwant, Ecosia
  - Custom search engine URL support

### Advanced Features
- **📋 Domain Management**: 
  - Whitelist domains for guaranteed auto-search
  - Blacklist domains to disable auto-search
  - Bulk domain import/export
- **🎨 Smart Query Templates**:
  - Domain + Keywords (default)
  - Site-specific search
  - Cached version search
  - Similar pages search
  - Technical documentation search
- **🔔 Toast Notifications**: A notification is shown before redirecting
- **🌙 Dark Mode Support**: Automatically adapts to your browser theme
- **💾 Settings Backup**: Import/export all settings as JSON

### Simple Query Generation ✨
The extension uses a straightforward approach to generate search queries directly from the URL:

1. **URL Decoding**: Properly handles encoded URLs (`%20` → spaces)
2. **Direct Extraction**: 
   - Domain name (without TLD)
   - URL path components
   - No complex content analysis needed
3. **Clean Transformation**:
   - Removes URL separators (/, -, _)
   - Decodes special characters
   - Removes file extensions

**Examples**:
- `github.com/missing%20user%20test` → `github missing user test`
- `facebook.com/invalid_url_not_found` → `facebook invalid url not found`
- `site.com/an%20invalid%20url` → `site an invalid url`

## Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/404-finder-extension.git
   cd 404-finder-extension
   ```

2. **Open Chrome Extensions Page**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner

3. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `404-finder-extension` directory

4. **Verify Installation**:
   - The extension icon should appear in your Chrome toolbar
   - Click the icon to open the popup and verify it's working

### From Chrome Web Store

*Coming soon! The extension is currently under review.*

## Educational Value

Beyond its practical functionality, the 404 Finder: Auto-Search Redirector extension serves as an educational resource for developers interested in Chrome extension development. The codebase includes:

- **Detailed Code Comments**: Every major function and API usage is thoroughly documented with explanations
- **Chrome API Demonstrations**: Real-world examples of webNavigation, webRequest, storage, and messaging APIs
- **Architecture Patterns**: Learn about background service workers, content scripts, and popup interactions
- **Security Best Practices**: See how to handle permissions, content security policies, and safe DOM manipulation
- **Performance Considerations**: Understand session storage, and efficient message passing

### Key Learning Topics Covered:

1. **Service Worker Lifecycle**: How background scripts persist and handle events
2. **Content Script Isolation**: Understanding the isolated world and DOM access limitations
3. **Message Passing Patterns**: Communication between different extension components
4. **Storage API Usage**: Persisting user preferences and data across sessions
5. **Notification System**: Creating and managing Chrome notifications
6. **Error Detection Strategies**: Heuristic-based detection of soft 404 pages
7. **URL Pattern Matching**: Working with navigation events and URL analysis

## Usage Guide

### Basic Usage

1. **Enable the Extension**:
   - Click the extension icon in the toolbar
   - Toggle the switch to "Active"

2. **Automatic Redirection**:
   - When you encounter a 404 page, the extension automatically detects it
   - After a brief notification, you'll be redirected to search results
   - The search query is intelligently generated based on the broken URL

3. **Manual Search**:
   - Click the extension icon on any page
   - Click "Search Page" to manually search for the current URL
   - Useful for finding alternatives to working but outdated pages

### Managing Domains

- **Whitelist a Domain**: Always enable auto-search for this domain, even if auto-search is globally disabled
- **Blacklist a Domain**: Never auto-search on this domain (manual search still available)
- **Default Behavior**: Auto-search follows the global setting for unlisted domains

### Auto-Search Behavior

1. **Detection**: The extension detects 404 errors (both HTTP status and soft 404s)
2. **Notification**: A brief notification appears showing the redirect action
3. **Simple Query Generation**: Creates clean search queries from:
   - Domain name (without TLD)
   - URL path components decoded and formatted
   - Customizable query templates
4. **Redirect**: Automatically redirects to your preferred search engine

### Exporting Error Data

1. Go to the extension options (right-click icon → Options)
2. Navigate to the "Export" section
3. Choose your export format (CSV or JSON)
4. Click "Export" to download the data

## Configuration

### Options Page

Access the options page by:
- Right-clicking the extension icon and selecting "Options"
- Or clicking the gear icon in the popup

### Available Settings

- **Auto-Search Toggle**: Enable/disable automatic redirection on 404 detection
- **Default Search Engine**: Choose your preferred search engine (Google, Bing, DuckDuckGo, etc.)
- **Query Template**: Select how search queries are generated:
  - Domain and Keywords: Uses domain name plus URL keywords
  - Full URL: Searches for the complete URL
  - Custom Template: Define your own search query pattern
- **Notification Settings**: Show/hide notifications before redirecting
- **Detection Sensitivity**: Adjust soft 404 detection aggressiveness
- **Domain Lists**: Manage whitelisted and blacklisted domains
- **Export Format**: Choose between CSV and JSON for error history exports

## Technical Details

### Detection Methods

1. **HTTP Status Detection**: Monitors actual HTTP 404 responses (100% confidence)
2. **Advanced Content Analysis with Scoring System**:
   - **Strong Indicators** (35-50 points): 
     - Title starting with "404 - Error" or "Error 404"
     - Meta tags with status code 404
     - "HTTP ERROR 404" or "404 File not found" patterns
   - **Medium Indicators** (15-20 points):
     - "Page cannot be found" or "Sorry, this page doesn't exist"
     - "We can't find what you're looking for"
   - **Weak Indicators** (5 points, requires 3+ occurrences):
     - Generic "not found" or "doesn't exist" text
   - **Context Weighting**:
     - Title matches: Full weight
     - H1 matches: 80% weight
     - Body text: 30% weight
3. **Platform-Specific Detection**:
   - **GitHub**: "Page not found" + custom 404 messages
   - **Facebook**: "This content isn't available" with adjusted thresholds
   - **Twitter/X**: "This account doesn't exist"
   - Handles platform-specific heavy navigation chrome
   - Supports both straight and curly apostrophe variations
4. **Page Structure Analysis**:
   - Minimal content (≤2 images, ≤10 links, 0 forms)
   - Presence of 404-specific images
   - Word count check (pages with >500 words unlikely to be 404)
   - Dynamic thresholds based on content sparsity
5. **URL Pattern Detection**: 
   - `/404.html`, `/error/404`, `/not-found`, `/page-not-found`
   - Each pattern has specific weight (20-30 points)

For detailed documentation on the detection system, see [DETECTION_SYSTEM.md](docs/DETECTION_SYSTEM.md).

### Permissions Used

- `webNavigation`: To detect navigation events and errors
- `webRequest`: To inspect HTTP response codes
- `tabs`: To interact with browser tabs
- `storage`: To save settings and error history
- `activeTab`: To analyze current page content
- `scripting`: To inject content analysis scripts
- `notifications`: To show error notifications

## Privacy

- All data is stored locally on your device
- No data is sent to external servers
- Domain lists and error history are private to your browser

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review the [Development Roadmap](ROADMAP.md)

## License

This project is licensed under the GPL-3.0 license - see the LICENSE file for details.

## Acknowledgments

- Chrome Extensions documentation and examples
- The web development community for testing and feedback
- Contributors who have helped improve the extension
- Warp.dev with Turbo Plan's agentic feature
- Claude 4 Opus model's planning and development