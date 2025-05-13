#!/bin/bash
# This script runs the fmt-patch-final.js without passing any additional arguments

echo "Starting prebuild script..."
# Run the patch script without any arguments
node ./fmt-patch-final.js
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "Error: fmt-patch-final.js exited with code $exit_code"
  exit $exit_code
fi

echo "Prebuild script completed successfully"
exit 0
