# Chrome Extension Packaging Guide

This guide explains the different methods to package your Chrome extension for distribution or testing.

## Method 1: Using build.sh Script (Recommended for Chrome Web Store)

This is the simplest method for creating a `.zip` file to upload to the Chrome Web Store.

### How to use:
```bash
# Make the script executable (only needed once)
chmod +x build.sh

# Run the build script
./build.sh
```

### What it does:
- Creates a `404-finder-extension.zip` file
- Excludes unnecessary files (markdown files, build scripts, hidden files, etc.)
- Ready to upload directly to Chrome Web Store

### When to use:
- When submitting to Chrome Web Store
- When sharing the extension with others
- When you want a clean package without development files

## Method 2: Chrome's Pack Extension Feature (Creates .crx file)

Chrome can create a `.crx` (Chrome Extension) file with a digital signature.

### How to use:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Pack extension"
4. Browse to your extension directory
5. Leave "Private key file" empty for first time
6. Click "Pack Extension"

### What happens:
- Creates two files:
  - `404-finder-extension.crx` - The packaged extension
  - `404-finder-extension.pem` - Your private key (KEEP THIS SAFE!)

### About the Private Key:
- **First time packing**: Leave it empty, Chrome generates one for you
- **Subsequent packing**: Use the same `.pem` file to maintain the same extension ID
- **IMPORTANT**: Keep the `.pem` file secure! It's like a password for your extension
- If you lose it, you'll get a different extension ID next time

### When to use:
- For distributing outside Chrome Web Store
- For testing signed extensions
- For enterprise deployments

## Method 3: Manual ZIP Creation

You can manually create a ZIP file.

### How to use:
```bash
# Create a ZIP file containing all extension files
zip -r extension.zip manifest.json src/ assets/ LICENSE

# Or exclude certain files
zip -r extension.zip . -x "*.md" -x "*.sh" -x ".*" -x "*.zip"
```

### When to use:
- Quick testing
- When you need specific file inclusion/exclusion

## Method 4: Load Unpacked (For Development)

This doesn't create a package but loads the extension directly.

### How to use:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your extension directory

### When to use:
- During development
- For testing changes quickly
- No packaging needed

## Chrome Web Store vs CRX Distribution

### Chrome Web Store (.zip file):
- **Pros**:
  - Automatic updates
  - User trust (vetted by Google)
  - Easy installation for users
  - No hosting needed
- **Cons**:
  - Review process takes time
  - Must follow store policies
  - $5 developer registration fee

### Direct CRX Distribution:
- **Pros**:
  - Immediate distribution
  - No review process
  - Full control
- **Cons**:
  - Users must enable "Developer mode"
  - No automatic updates
  - Less user trust
  - You must host the file

## Best Practices

1. **Version Control**: Always increment the version in `manifest.json` before packaging
2. **Testing**: Test the packaged extension before distribution
3. **File Size**: Keep the package under 100MB for Chrome Web Store
4. **Clean Build**: Remove development files, logs, and test data
5. **Documentation**: Include a README for complex extensions

## File Structure for Packaging

Your extension should have this structure:
```
404-finder-extension/
├── manifest.json (required)
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── options/
├── assets/
│   └── icons/
└── LICENSE
```

## Troubleshooting

### "Invalid manifest" error:
- Check `manifest.json` for syntax errors
- Ensure all referenced files exist
- Validate JSON format

### Extension not working after packaging:
- Check file paths in manifest.json
- Ensure all permissions are declared
- Look at Chrome's extension error console

### Large package size:
- Remove unnecessary files
- Optimize images
- Check for accidentally included node_modules

## Security Notes

1. **Never share your .pem file** - It's like sharing your private key
2. **Use official distribution channels** when possible
3. **Sign your updates** with the same private key
4. **Version consistently** to help users identify legitimate updates

---

For your current extension, the `build.sh` script is the recommended approach for creating a package for the Chrome Web Store. The resulting `404-finder-extension.zip` file is ready for upload!
