#!/bin/bash

# Run the original pre-install script if it exists
if [ -f ".eas-hooks/eas-build-pre-install.sh" ]; then
  bash .eas-hooks/eas-build-pre-install.sh
fi

# Run our Podfile patch script
bash patch-podfile.sh

# Make the script executable
chmod +x patch-podfile.sh

echo "Patched Podfile for iOS build"
