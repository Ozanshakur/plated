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

# Fix the Podfile
echo "Fixing the Podfile..."
PODFILE_PATH="$(pwd)/ios/Podfile"

if [ -f "$PODFILE_PATH" ]; then
  # Create a backup of the original Podfile
  cp "$PODFILE_PATH" "${PODFILE_PATH}.bak"
  
  # Replace the problematic line in the Podfile
  sed -i.tmp 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' "$PODFILE_PATH"
  
  # Check if the replacement was successful
  if grep -q "config = use_native_modules!" "$PODFILE_PATH"; then
    echo "Successfully fixed the Podfile"
  else
    echo "Failed to fix the Podfile. Manual intervention required."
    # Restore the backup if the fix failed
    cp "${PODFILE_PATH}.bak" "$PODFILE_PATH"
  fi
  
  # Clean up temporary files
  rm -f "${PODFILE_PATH}.tmp" "${PODFILE_PATH}.bak"
else
  echo "Podfile not found at $PODFILE_PATH"
fi

# Make this script executable
chmod +x "$(pwd)/.eas-hooks/eas-build-pre-install.sh"

echo "EAS pre-install hook is ready"
