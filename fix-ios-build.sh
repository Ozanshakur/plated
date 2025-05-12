#!/bin/bash

# Create the Podfile.rb file if it doesn't exist
if [ ! -f "ios/Podfile.rb" ]; then
  echo "Creating Podfile.rb with folly config helper..."
  cat > ios/Podfile.rb << 'EOL'
# This helper function provides the folly compiler flags to the pods that need them
def get_folly_config
  return {
    :compiler_flags => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
  }
end
EOL
fi

# Add the require statement to Podfile if it's not already there
if ! grep -q "require_relative 'Podfile.rb'" ios/Podfile; then
  echo "Adding require statement to Podfile..."
  sed -i '' 's/require File.join(File.dirname(`node --print "require.resolve('\''react-native\/package.json'\'')`), "scripts", "react_native_pods")/require File.join(File.dirname(`node --print "require.resolve('\''react-native\/package.json'\'')`), "scripts", "react_native_pods")\nrequire_relative '\''Podfile.rb'\''/' ios/Podfile
fi

echo "iOS build fix applied. Please run 'pod install' in the ios directory again."
