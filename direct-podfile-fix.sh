#!/bin/bash

# This script is a direct approach to fix the Podfile issue
# It should be run on the EAS Build server

# Exit on error
set -e

echo "🔍 Checking for Podfile..."

# Check if we're in the right directory
if [ -f "ios/Podfile" ]; then
  echo "📄 Found Podfile at ios/Podfile"
  
  # Make a backup
  cp ios/Podfile ios/Podfile.backup
  
  # Fix the problematic line
  sed -i.bak 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' ios/Podfile
  
  # Check if the replacement was successful
  if grep -q "config = use_native_modules!" ios/Podfile; then
    echo "✅ Successfully patched Podfile"
    cat ios/Podfile | grep -A 2 -B 2 "use_native_modules!"
  else
    echo "❌ Failed to patch Podfile with sed"
    
    # Try a more direct approach
    echo "🔄 Trying a more direct approach..."
    
    # Read the file
    PODFILE_CONTENT=$(cat ios/Podfile)
    
    # Replace the problematic line
    FIXED_CONTENT="${PODFILE_CONTENT//config = use_native_modules!(config_command)/config = use_native_modules!}"
    
    # Write the fixed content back
    echo "$FIXED_CONTENT" > ios/Podfile
    
    # Check if the replacement was successful
    if grep -q "config = use_native_modules!" ios/Podfile; then
      echo "✅ Successfully patched Podfile with direct replacement"
      cat ios/Podfile | grep -A 2 -B 2 "use_native_modules!"
    else
      echo "❌ Failed to patch Podfile with direct replacement"
      echo "⚠️ Restoring backup..."
      cp ios/Podfile.backup ios/Podfile
    fi
  fi
else
  echo "❌ Podfile not found at ios/Podfile"
  
  # Try to find the Podfile
  PODFILE_PATH=$(find . -name "Podfile" | grep -v "node_modules" | head -n 1)
  
  if [ -n "$PODFILE_PATH" ]; then
    echo "📄 Found Podfile at $PODFILE_PATH"
    
    # Make a backup
    cp "$PODFILE_PATH" "${PODFILE_PATH}.backup"
    
    # Fix the problematic line
    sed -i.bak 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' "$PODFILE_PATH"
    
    # Check if the replacement was successful
    if grep -q "config = use_native_modules!" "$PODFILE_PATH"; then
      echo "✅ Successfully patched Podfile"
      cat "$PODFILE_PATH" | grep -A 2 -B 2 "use_native_modules!"
    else
      echo "❌ Failed to patch Podfile"
      echo "⚠️ Restoring backup..."
      cp "${PODFILE_PATH}.backup" "$PODFILE_PATH"
    fi
  else
    echo "❌ Could not find any Podfile in the project"
  fi
fi

echo "🚀 Script completed"
