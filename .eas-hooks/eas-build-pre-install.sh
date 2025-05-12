#!/bin/bash

# Exit on error
set -e

# Log the current directory
echo "Current directory: $(pwd)"

# Create the fix-expo-podspec.js script in the project root
cat > "$(pwd)/fix-expo-podspec.js" << 'EOL'
const fs = require('fs');
const path = require('path');

// Function to patch the Expo.podspec file
function patchExpoPodspec() {
  try {
    // Path to Expo.podspec
    const expoPath = path.join(process.cwd(), 'node_modules', 'expo', 'Expo.podspec');
    
    // Check if the file exists
    if (fs.existsSync(expoPath)) {
      // Read the file
      const content = fs.readFileSync(expoPath, 'utf8');
      
      // Check if the file already contains our patch
      if (content.includes('if defined?(get_folly_config)')) {
        console.log('Expo.podspec is already patched.');
      } else {
        // Apply the patch
        const patchedContent = content.replace(
          'compiler_flags = get_folly_config()[:compiler_flags]',
          `# Define folly config directly if get_folly_config is not available
  compiler_flags = begin
    if defined?(get_folly_config)
      get_folly_config()[:compiler_flags]
    else
      "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
    end
  end`
        );
        
        // Write the file back
        fs.writeFileSync(expoPath, patchedContent);
        console.log('Successfully patched Expo.podspec');
      }
    } else {
      console.log('Expo.podspec not found. Skipping patch.');
    }
    
    // Path to ExpoModulesCore.podspec
    const expoModulesCorePath = path.join(process.cwd(), 'node_modules', 'expo-modules-core', 'ExpoModulesCore.podspec');
    
    // Check if the file exists
    if (fs.existsSync(expoModulesCorePath)) {
      // Read the file
      const coreContent = fs.readFileSync(expoModulesCorePath, 'utf8');
      
      // Check if the file already contains our patch
      if (coreContent.includes('if defined?(get_folly_config)')) {
        console.log('ExpoModulesCore.podspec is already patched.');
      } else {
        // Apply the patch
        const patchedCoreContent = coreContent.replace(
          'compiler_flags = get_folly_config()[:compiler_flags] + \' \' + "-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}"',
          `# Define folly config directly if get_folly_config is not available
  compiler_flags = begin
    if defined?(get_folly_config)
      get_folly_config()[:compiler_flags]
    else
      "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
    end
  end + ' ' + "-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}"`
        );
        
        // Write the file back
        fs.writeFileSync(expoModulesCorePath, patchedCoreContent);
        console.log('Successfully patched ExpoModulesCore.podspec');
      }
    } else {
      console.log('ExpoModulesCore.podspec not found. Skipping patch.');
    }
  } catch (error) {
    console.error('Error patching podspec files:', error);
  }
}

// Run the patch function
patchExpoPodspec();
EOL

echo "Created fix-expo-podspec.js script"

# Make this script executable in the EAS Build environment
chmod +x .eas-hooks/eas-build-pre-install.sh

# Check if we're building for iOS
if [ -d "ios" ]; then
  echo "📱 iOS build detected"
  
  # Wait for the Podfile to be generated
  while [ ! -f "ios/Podfile" ]; do
    echo "⏳ Waiting for Podfile to be generated..."
    sleep 1
  done
  
  echo "🔍 Found Podfile, checking for issues..."
  
  # Make a backup of the original Podfile
  cp ios/Podfile ios/Podfile.backup
  
  # Fix the problematic line in the Podfile
  sed -i.bak 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' ios/Podfile
  
  # Check if the replacement was successful
  if grep -q "config = use_native_modules!" ios/Podfile; then
    echo "✅ Successfully patched Podfile"
  else
    echo "❌ Failed to patch Podfile"
    # Restore the backup if the patch failed
    cp ios/Podfile.backup ios/Podfile
  fi
fi

echo "🚀 Pre-install hook completed"
