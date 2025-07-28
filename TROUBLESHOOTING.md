# Troubleshooting Guide for 404 Finder Extension

This troubleshooting guide provides solutions and guidance for common issues encountered with the 404 Finder Chrome Extension.

## Common Issues

### Extension Not Detecting 404 Errors
- **Symptom**: The extension fails to detect any 404 errors on known error pages.
- **Solution**:
  1. Check if the extension is enabled by clicking the icon in the toolbar.
  2. Ensure permissions like `webNavigation` and `webRequest` are granted.
  3. Reload the page to trigger detection mechanisms.

### Error Notifications Not Appearing
- **Symptom**: Error notifications are not being displayed.
- **Solution**:
  1. Verify that notification permissions are enabled.
  2. Check the extension settings to ensure notifications are not disabled.
  3. Review browser notification settings.

### Domain Whitelisting/Blacklisting Not Working
- **Symptom**: Changes to whitelist/blacklist aren't applied.
- **Solution**:
  1. Open the extension popup and confirm the domain status.
  2. Ensure you're adding the correct domain format (e.g., `example.com`).
  3. Restart the browser to refresh domain settings.

### Badge Counter Stuck
- **Symptom**: The badge counter displays outdated information.
- **Solution**:
  1. Refresh the browser tab to update counter information.
  2. Clear the browser cache or reload the extension.

### Export Functionality Fails
- **Symptom**: Error data can't be exported.
- **Solution**:
  1. Check if you have sufficient storage space.
  2. Ensure your browser allows data downloads via extensions.

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
