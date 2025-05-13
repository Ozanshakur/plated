#!/bin/bash
echo "Patching Podfile for EAS build..."
sed -i '' 's/use_react_native!.*hermes_enabled.*true/use_react_native!(hermes_enabled: false)/g' Podfile
echo '# Fix fmt library issues\npod \'fmt\', \'~> 6.2.1\', :modular_headers => true' >> Podfile
echo "Podfile patched successfully!"
