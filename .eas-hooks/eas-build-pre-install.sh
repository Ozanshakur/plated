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
    if (!fs.existsSync(expoPath)) {
      console.log('Expo.podspec not found. Skipping patch.');
      return;
    }
    
    // Read the file
    let content = fs.readFileSync(expoPath, 'utf8');
    
    // Check if the file already contains our patch
    if (content.includes('if defined?(get_folly_config)')) {
      console.log('Expo.podspec is already patched.');
      return;
    }
    
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
  } catch (error) {
    console.error('Error patching Expo.podspec:', error);
  }
}

// Run the patch function
patchExpoPodspec();
EOL

echo "Created fix-expo-podspec.js script"

# Make the directory for the hooks if it doesn't exist
mkdir -p .eas-hooks

# Make this script executable
chmod +x "$(pwd)/.eas-hooks/eas-build-pre-install.sh"

echo "EAS pre-install hook is ready"
