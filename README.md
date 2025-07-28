# 404 Finder Chrome Extension

A powerful Chrome extension that automatically detects and tracks 404 errors while browsing the web. It can identify both hard 404s (HTTP status code 404) and soft 404s (pages that return 200 but display 404 content).

## Features

- **Automatic 404 Detection**: Detects both HTTP 404 errors and soft 404s
- **Smart Content Analysis**: Uses advanced pattern matching to identify error pages
- **Domain Management**: Whitelist or blacklist domains for monitoring
- **Search Engine Integration**: Quickly search for broken links across multiple search engines
- **Real-time Notifications**: Get notified when 404 errors are detected
- **Error History**: Track and export all detected 404 errors
- **Badge Counter**: Shows error count directly on the extension icon
- **Customizable Settings**: Configure detection sensitivity and notification preferences

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

## Usage Guide

### Basic Usage

1. **Enable the Extension**:
   - Click the extension icon in the toolbar
   - Toggle the switch to "Active"

2. **Browse Normally**:
   - The extension runs in the background
   - It automatically detects 404 errors as you browse

3. **View Detected Errors**:
   - Click the extension icon to see the current page status
   - The badge shows the number of errors on the current tab

### Managing Domains

- **Whitelist a Domain**: Domains on the whitelist are always monitored
- **Blacklist a Domain**: Domains on the blacklist are never monitored
- **Default Behavior**: Unlisted domains are monitored based on your global settings

### Searching for Broken Links

1. Click the extension icon
2. Select "Search for broken links"
3. Choose your preferred search engines
4. The extension will open tabs with search results

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

- **Detection Sensitivity**: Adjust how aggressively the extension detects soft 404s
- **Notification Settings**: Choose when to receive notifications
- **Search Engines**: Select which search engines to use
- **Auto-Clear History**: Set how long to keep error history
- **Export Format**: Choose between CSV and JSON for exports

## Technical Details

### Detection Methods

1. **HTTP Status Detection**: Monitors actual HTTP 404 responses
2. **Content Analysis**: Analyzes page content for 404 indicators
3. **Pattern Matching**: Looks for common 404 phrases in multiple languages
4. **URL Analysis**: Checks for typical 404 URL patterns

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