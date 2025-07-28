#!/bin/bash

# Define the output zip file
OUTPUT_ZIP="404-finder-extension.zip"

# Clean up any existing zip file
if [ -f "$OUTPUT_ZIP" ]; then
  echo "Removing existing $OUTPUT_ZIP"
  rm "$OUTPUT_ZIP"
fi

# Package the extension (current directory)
echo "Packaging extension..."
zip -r "$OUTPUT_ZIP" . \
  -x "*.zip" \
  -x ".*" \
  -x "*.md" \
  -x "*.sh" \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "test-*" \
  -x "docs/*"

echo "Successfully created $OUTPUT_ZIP"
echo "Size: $(du -h $OUTPUT_ZIP | cut -f1)"
echo ""
echo "You can now upload this zip file to the Chrome Web Store!"
