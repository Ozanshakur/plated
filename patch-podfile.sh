#!/bin/bash

# Path to the Podfile
PODFILE_PATH="ios/Podfile"

# Check if the Podfile exists
if [ ! -f "$PODFILE_PATH" ]; then
  echo "Podfile not found at $PODFILE_PATH"
  exit 1
fi

# Create a backup of the original Podfile
cp "$PODFILE_PATH" "${PODFILE_PATH}.bak"

# Replace the problematic line
sed -i '' 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' "$PODFILE_PATH"

echo "Podfile patched successfully"
