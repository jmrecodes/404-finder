# Troubleshooting Guide - 404 Finder: Auto-Search Redirector Extension

This guide helps resolve common issues with the 404 Finder: Auto-Search Redirector Auto-Search Redirector extension.

## 🔧 Common Issues & Solutions

### Extension Not Detecting 404 Errors
**Symptoms**: 
- Extension doesn't redirect on known 404 pages
- No auto-search happens on broken links

**Solutions**:
1. **Check Extension Status**:
   - Click the extension icon
   - Ensure the toggle switch is "ON" (Active)
   - Look for "Active" status indicator

2. **Verify Domain Settings**:
   - Check if the domain is blacklisted
   - Popup shows: "Blacklisted" = auto-search disabled
   - Remove from blacklist in Options if needed

3. **Reload the Page**:
   - Press `Ctrl+R` (Windows) or `Cmd+R` (Mac)
   - This triggers fresh detection

4. **Check "Enable auto-search" Setting**:
   - Go to Options → Auto-Search Settings
   - Ensure "Enable auto-search for all domains" is checked

### Auto-Redirect Not Working
**Symptoms**:
- 404 detected but no redirect happens
- Notification appears but page doesn't change

**Solutions**:
1. **Verify Search Engine Settings**:
   - Go to Options → Search Engine Preferences
   - Ensure a valid search engine is selected
   - If using "Custom URL", verify the URL format includes `{query}`

2. **Check for Search Engine Loops**:
   - Extension won't redirect if you're already on a search engine
   - This prevents infinite redirect loops

3. **Clear Browser Cache**:
   - Sometimes cached pages interfere
   - Clear cache for the affected site

### Notifications Not Appearing
**Symptoms**:
- No notification before redirect
- Missing auto-search alerts

**Solutions**:
1. **Check Chrome Notification Settings**:
   - Go to Chrome Settings → Privacy and security → Site Settings → Notifications
   - Ensure notifications aren't blocked globally

2. **Verify Extension Settings**:
   - Options → Auto-Search Settings
   - Enable "Show notifications for auto-search actions"

3. **Windows/Mac Notification Settings**:
   - Check OS-level notification settings
   - Ensure Chrome has permission to show notifications

### Wrong or Poor Search Results
**Symptoms**:
- Search queries don't match the content you expected
- Too generic or irrelevant results

**Solutions**:
1. **Try Different Query Templates**:
   - Options → Search Engine Preferences → Query Template
   - "Site-specific Search" for finding pages on same site
   - "Similar Pages" for alternative content

2. **Use Manual Search**:
   - Click extension icon → "Search Page"
   - This gives you more control

3. **Understand Smart Query Generation**:
   - Extension extracts keywords from:
     - Page title (cleaned of error messages)
     - URL path segments
     - Meta descriptions
     - Breadcrumb navigation
   - Stop words are filtered out
   - Domain name gets priority

## Advanced Troubleshooting

### Debugging Options
- **Enable Developer Mode**:
  1. Go to `chrome://extensions/`.
  2. Toggle "Developer mode" to ON.
  3. Check the console for any error messages related to the extension.

### Logs and Reporting
- **Log Collection**:
  1. Collect console logs for submission with bug reports.
  2. Screen capture any visual errors or unexpected behavior.

### Contact Support
- For unresolved issues, please reach out to our support team with:
  - A description of the issue
  - Steps to reproduce it
  - Browser version and OS details

## Acknowledgments
- Inspired by community feedback and real-world usage scenarios. Thank you to everyone who reported issues and contributed fixes.

---

Keep this guide handy for quick resolutions to common problems. For further assistance, please visit our [GitHub Issues](https://github.com/yourusername/404-finder-extension/issues) page.
