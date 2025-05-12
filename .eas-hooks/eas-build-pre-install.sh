#!/bin/bash

# Exit on error
set -e

# Log the current directory
echo "Current directory: $(pwd)"

# This script will be run during the EAS Build process before dependencies are installed
echo "Running pre-install hook to patch Expo.podspec"

# Wait for the node_modules directory to be created
MAX_RETRIES=30
RETRY_COUNT=0
EXPO_PODSPEC_PATH="/Users/expo/workingdir/build/node_modules/expo/Expo.podspec"

while [ ! -f "$EXPO_PODSPEC_PATH" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Waiting for Expo.podspec to be created... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ ! -f "$EXPO_PODSPEC_PATH" ]; then
  echo "Expo.podspec not found after waiting. Will try to patch it later in the build process."
  exit 0
fi

echo "Found Expo.podspec at $EXPO_PODSPEC_PATH"

# Create a backup of the original file
cp "$EXPO_PODSPEC_PATH" "${EXPO_PODSPEC_PATH}.backup"

# Check if the file contains the problematic line
if grep -q "compiler_flags = get_folly_config()\[:compiler_flags\]" "$EXPO_PODSPEC_PATH"; then
  echo "Found problematic line in Expo.podspec, patching..."
  
  # Create a temporary file with the patched content
  TMP_FILE=$(mktemp)
  
  # Add the missing get_folly_config function before the problematic line
  awk '{
    if ($0 ~ /compiler_flags = get_folly_config$$$$\[:compiler_flags\]/) {
      print "# Define the missing get_folly_config function"
      print "def get_folly_config"
      print "  { :compiler_flags => [\"-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73\"] }"
      print "end"
      print ""
    }
    print $0
  }' "$EXPO_PODSPEC_PATH" > "$TMP_FILE"
  
  # Replace the original file with the patched one
  mv "$TMP_FILE" "$EXPO_PODSPEC_PATH"
  
  echo "Successfully patched Expo.podspec"
else
  echo "The problematic line was not found in Expo.podspec"
fi

# Also check for the config_command issue in Podfile
PODFILE_PATH="/Users/expo/workingdir/build/ios/Podfile"

if [ -f "$PODFILE_PATH" ]; then
  echo "Found Podfile at $PODFILE_PATH"
  
  # Create a backup of the original file
  cp "$PODFILE_PATH" "${PODFILE_PATH}.backup"
  
  # Check if the file contains the problematic line
  if grep -q "config = use_native_modules!(config_command)" "$PODFILE_PATH"; then
    echo "Found problematic line in Podfile, patching..."
    
    # Replace the problematic line
    sed -i '' 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' "$PODFILE_PATH"
    
    echo "Successfully patched Podfile"
  else
    echo "The problematic line was not found in Podfile"
  fi
else
  echo "Podfile not found at $PODFILE_PATH"
fi

# Create the fix-expo-podspec.js script in the project root
# cat > "$(pwd)/fix-expo-podspec.js" << 'EOL'
# const fs = require('fs');
# const path = require('path');

# // Function to patch the Expo.podspec file
# function patchExpoPodspec() {
#   try {
#     // Path to Expo.podspec
#     const expoPath = path.join(process.cwd(), 'node_modules', 'expo', 'Expo.podspec');
    
#     // Check if the file exists
#     if (fs.existsSync(expoPath)) {
#       // Read the file
#       const content = fs.readFileSync(expoPath, 'utf8');
      
#       // Check if the file already contains our patch
#       if (content.includes('if defined?(get_folly_config)')) {
#         console.log('Expo.podspec is already patched.');
#       } else {
#         // Apply the patch
#         const patchedContent = content.replace(
#           'compiler_flags = get_folly_config()[:compiler_flags]',
#           `# Define folly config directly if get_folly_config is not available
#   compiler_flags = begin
#     if defined?(get_folly_config)
#       get_folly_config()[:compiler_flags]
#     else
#       "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
#     end
#   end`
#         );
        
#         // Write the file back
#         fs.writeFileSync(expoPath, patchedContent);
#         console.log('Successfully patched Expo.podspec');
#       }
#     } else {
#       console.log('Expo.podspec not found. Skipping patch.');
#     }
    
#     // Path to ExpoModulesCore.podspec
#     const expoModulesCorePath = path.join(process.cwd(), 'node_modules', 'expo-modules-core', 'ExpoModulesCore.podspec');
    
#     // Check if the file exists
#     if (fs.existsSync(expoModulesCorePath)) {
#       // Read the file
#       const coreContent = fs.readFileSync(expoModulesCorePath, 'utf8');
      
#       // Check if the file already contains our patch
#       if (coreContent.includes('if defined?(get_folly_config)')) {
#         console.log('ExpoModulesCore.podspec is already patched.');
#       } else {
#         // Apply the patch
#         const patchedCoreContent = coreContent.replace(
#           'compiler_flags = get_folly_config()[:compiler_flags] + \' \' + "-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}"',
#           `# Define folly config directly if get_folly_config is not available
#   compiler_flags = begin
#     if defined?(get_folly_config)
#       get_folly_config()[:compiler_flags]
#     else
#       "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
#     end
#   end + ' ' + "-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}"`
#         );
        
#         // Write the file back
#         fs.writeFileSync(expoModulesCorePath, patchedCoreContent);
#         console.log('Successfully patched ExpoModulesCore.podspec');
#       }
#     } else {
#       console.log('ExpoModulesCore.podspec not found. Skipping patch.');
#     }
#   } catch (error) {
#     console.error('Error patching podspec files:', error);
#   }
# }

# // Run the patch function
# patchExpoPodspec();
# EOL

# echo "Created fix-expo-podspec.js script"

# Make this script executable in the EAS Build environment
chmod +x .eas-hooks/eas-build-pre-install.sh

# Check if we're building for iOS
# if [ -d "ios" ]; then
#   echo "📱 iOS build detected"
  
#   # Wait for the Podfile to be generated
#   while [ ! -f "ios/Podfile" ]; do
#     echo "⏳ Waiting for Podfile to be generated..."
#     sleep 1
#   done
  
#   echo "🔍 Found Podfile, checking for issues..."
  
#   # Make a backup of the original Podfile
#   cp ios/Podfile ios/Podfile.backup
  
#   # Fix the problematic line in the Podfile
#   sed -i.bak 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' ios/Podfile
  
#   # Check if the replacement was successful
#   if grep -q "config = use_native_modules!" ios/Podfile; then
#     echo "✅ Successfully patched Podfile"
#   else
#     echo "❌ Failed to patch Podfile"
#     # Restore the backup if the patch failed
#     cp ios/Podfile.backup ios/Podfile
#   fi
# fi

echo "Pre-install hook completed"
