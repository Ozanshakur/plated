#!/bin/bash

# Exit on error
set -e

# Create the fix-expo-podspec.js script
echo "Creating fix-expo-podspec.js script..."
cat > fix-expo-podspec.js << 'EOL'
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

# Update package.json to use the new script
echo "Updating package.json..."
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts.postinstall = 'node fix-expo-podspec.js';
// Remove patch-package from scripts if it exists
if (packageJson.scripts.prepare) delete packageJson.scripts.prepare;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
"

# Create .eas-hooks directory if it doesn't exist
mkdir -p .eas-hooks

# Create the pre-install hook
echo "Creating EAS pre-install hook..."
cat > .eas-hooks/eas-build-pre-install.sh << 'EOL'
#!/bin/bash

# Exit on error
set -e

# Log the current directory
echo "Current directory: $(pwd)"

# Run the fix-expo-podspec.js script
echo "Running fix-expo-podspec.js script..."
node "$(pwd)/fix-expo-podspec.js"

echo "Pre-install hook completed"
EOL

# Make the hook executable
chmod +x .eas-hooks/eas-build-pre-install.sh

# Remove any existing patch files for expo to avoid conflicts
echo "Cleaning up any existing patch files..."
rm -rf patches/expo+*

# Clean install dependencies
echo "Reinstalling dependencies..."
npm install

echo "Setup complete! Your project is now ready for iOS builds."
