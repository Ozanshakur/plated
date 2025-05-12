#!/bin/bash

# Exit on error
set -e

echo "Setting up iOS build fixes..."

# Create the fix-expo-podspec.js script
cat > fix-expo-podspec.js << 'EOL'
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

echo "Created fix-expo-podspec.js"

# Create the EAS hooks directory
mkdir -p .eas-hooks

# Create the EAS pre-install hook
cat > .eas-hooks/eas-build-pre-install.sh << 'EOL'
#!/bin/bash

# Exit on error
set -e

# Log the current directory
echo "Current directory: $(pwd)"

# Run the fix script
node "$(pwd)/fix-expo-podspec.js"

echo "Applied podspec fixes"
EOL

# Make the hook executable
chmod +x .eas-hooks/eas-build-pre-install.sh

echo "Created EAS pre-install hook"

# Update package.json to include the postinstall script
# This is a simple approach - in a real scenario, you might want to use a JSON parser
if grep -q "\"postinstall\":" package.json; then
  echo "package.json already has a postinstall script, please add 'node fix-expo-podspec.js' to it manually"
else
  # Use sed to add the postinstall script
  sed -i.bak 's/"scripts": {/"scripts": {\n    "postinstall": "node fix-expo-podspec.js",/' package.json
  rm package.json.bak
  echo "Added postinstall script to package.json"
fi

# Clean up any existing patch files
if [ -d "patches" ]; then
  rm -rf patches/expo+*
  echo "Removed any existing expo patches"
fi

echo "Setup complete! Now run 'npm install' to apply the fixes"
