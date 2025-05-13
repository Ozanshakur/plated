const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("Starting comprehensive fmt library fix for iOS build...")

// Create a complete patch file for the fmt library
const patchContent = `
// Complete patch for fmt library to fix char_traits issue
#include <string>
#include <cstring>
#include <iostream>
#include <streambuf>

// Define the char8_type before it's used
namespace fmt {
    namespace internal {
        typedef char char8_type;
    }
}

// Provide the missing specialization that's causing the build error
namespace std {
    template <>
    struct char_traits<fmt::internal::char8_type> {
        typedef fmt::internal::char8_type char_type;
        typedef int int_type;
        typedef streampos pos_type;
        typedef streamoff off_type;
        typedef mbstate_t state_type;

        static void assign(char_type& c1, const char_type& c2) noexcept {
            c1 = c2;
        }

        static bool eq(const char_type& c1, const char_type& c2) noexcept {
            return c1 == c2;
        }

        static bool lt(const char_type& c1, const char_type& c2) noexcept {
            return c1 < c2;
        }

        static int compare(const char_type* s1, const char_type* s2, size_t n) {
            return memcmp(s1, s2, n);
        }

        static size_t length(const char_type* s) {
            return strlen(s);
        }

        static const char_type* find(const char_type* s, size_t n, const char_type& a) {
            return static_cast<const char_type*>(memchr(s, a, n));
        }

        static char_type* move(char_type* s1, const char_type* s2, size_t n) {
            return static_cast<char_type*>(memmove(s1, s2, n));
        }

        static char_type* copy(char_type* s1, const char_type* s2, size_t n) {
            return static_cast<char_type*>(memcpy(s1, s2, n));
        }

        static char_type* assign(char_type* s, size_t n, char_type a) {
            return static_cast<char_type*>(memset(s, a, n));
        }

        static int_type not_eof(int_type c) noexcept {
            return c != EOF ? c : 0;
        }

        static char_type to_char_type(int_type c) noexcept {
            return static_cast<char_type>(c);
        }

        static int_type to_int_type(char_type c) noexcept {
            return static_cast<int_type>(c);
        }

        static bool eq_int_type(int_type c1, int_type c2) noexcept {
            return c1 == c2;
        }

        static int_type eof() noexcept {
            return EOF;
        }
    };
}
`

// Create directories
const patchDir = path.join("ios", "fmt-patch")
if (!fs.existsSync(patchDir)) {
  fs.mkdirSync(patchDir, { recursive: true })
}

// Write the patch file
const patchFilePath = path.join(patchDir, "fmt-char-traits-patch.h")
fs.writeFileSync(patchFilePath, patchContent)
console.log(`Created patch file at ${patchFilePath}`)

// Create a modified Podfile with fmt fixes
const podfileContent = `
require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")
require File.join(File.dirname(\`node --print "require.resolve('@react-native-community/cli-platform-ios/package.json')"\`), "native_modules")

platform :ios, '13.0'
prepare_react_native_project!

flipper_config = ENV['NO_FLIPPER'] == "1" ? FlipperConfiguration.disabled : FlipperConfiguration.enabled

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target 'Plated' do
  use_expo_modules!
  post_integrate do |installer|
    begin
      expo_patch_react_imports!(installer)
    rescue => e
      Pod::UI.warn e
    end
  end
  config = use_native_modules!

  # Flags change depending on the env values.
  flags = get_default_flags()

  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is now enabled by default. Disable by setting this flag to false.
    :hermes_enabled => false,
    :fabric_enabled => flags[:fabric_enabled],
    # Enables Flipper.
    #
    # Note that if you have use_frameworks! enabled, Flipper will not work and
    # you should disable the next line.
    :flipper_configuration => flipper_config,
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  # Explicitly specify fmt version
  pod 'fmt', '6.2.1'

  post_install do |installer|
    # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    __apply_Xcode_12_5_M1_post_install_workaround(installer)
    
    # Comprehensive fix for fmt library
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          # Add preprocessor definitions
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_NONTYPE_TEMPLATE_PARAMETERS=0'
          
          # Set C++ standard to C++17 which has better support
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          
          # Add our patch header as a prefix header
          patch_path = File.join(Dir.pwd, 'ios/fmt-patch/fmt-char-traits-patch.h')
          config.build_settings['GCC_PREFIX_HEADER'] = patch_path
          
          # Force include our patch file
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= '$(inherited)'
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] += ' -include "$(PODS_ROOT)/../fmt-patch/fmt-char-traits-patch.h"'
          
          # Add the patch directory to header search paths
          config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
          config.build_settings['HEADER_SEARCH_PATHS'] += ' "$(PODS_ROOT)/../fmt-patch"'
        end
      end
    end
  end
end
`

// Write the modified Podfile
const podfilePath = path.join("ios", "Podfile")
fs.writeFileSync(podfilePath, podfileContent)
console.log(`Updated Podfile at ${podfilePath}`)

// Create a patch script that will be run during the build process
const patchScriptContent = `#!/bin/bash
echo "Applying fmt library patch for iOS build..."

# Create patch directory if it doesn't exist
mkdir -p ios/fmt-patch

# Create the patch header file
cat > ios/fmt-patch/fmt-char-traits-patch.h << 'EOL'
${patchContent}
EOL

echo "Patch file created at ios/fmt-patch/fmt-char-traits-patch.h"

# Find the fmt format.cc file and patch it if needed
FMT_FORMAT_CC=$(find ios -path "*/Pods/fmt/src/format.cc" 2>/dev/null)

if [ -n "$FMT_FORMAT_CC" ]; then
  echo "Found fmt format.cc at $FMT_FORMAT_CC"
  
  # Create backup
  cp "$FMT_FORMAT_CC" "${FMT_FORMAT_CC}.bak"
  
  # Add include for our patch at the top of the file
  echo '#include "fmt-char-traits-patch.h"' > "\${FMT_FORMAT_CC}.new"
  cat "$FMT_FORMAT_CC" >> "\${FMT_FORMAT_CC}.new"
  mv "\${FMT_FORMAT_CC}.new" "$FMT_FORMAT_CC"
  
  echo "Successfully patched $FMT_FORMAT_CC"
else
  echo "fmt format.cc not found yet, it will be patched during the build process"
fi

echo "Patch script completed successfully"
`

// Write the patch script
const patchScriptPath = path.join("ios", "patch-fmt-library.sh")
fs.writeFileSync(patchScriptPath, patchScriptContent)
fs.chmodSync(patchScriptPath, "755") // Make executable
console.log(`Created patch script at ${patchScriptPath}`)

// Create a header file that will be directly included in the fmt library
const headerPatchPath = path.join("ios", "fmt-patch", "fmt-char-traits-patch.h")
if (!fs.existsSync(path.dirname(headerPatchPath))) {
  fs.mkdirSync(path.dirname(headerPatchPath), { recursive: true })
}
fs.writeFileSync(headerPatchPath, patchContent)
console.log(`Created header patch at ${headerPatchPath}`)

// Create a post-install script to run after npm install
const postInstallScriptContent = `#!/bin/bash
echo "Running post-install fmt library patch..."

# Run the patch script
if [ -f "ios/patch-fmt-library.sh" ]; then
  chmod +x ios/patch-fmt-library.sh
  ./ios/patch-fmt-library.sh
else
  echo "Patch script not found at ios/patch-fmt-library.sh"
fi

echo "Post-install script completed"
`

const postInstallScriptPath = "post-install.sh"
fs.writeFileSync(postInstallScriptPath, postInstallScriptContent)
fs.chmodSync(postInstallScriptPath, "755") // Make executable
console.log(`Created post-install script at ${postInstallScriptPath}`)

// Update package.json to include the post-install script
try {
  const packageJsonPath = "package.json"
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

    // Add or update postinstall script
    packageJson.scripts = packageJson.scripts || {}
    packageJson.scripts.postinstall = "./post-install.sh"

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    console.log("Updated package.json with postinstall script")
  } else {
    console.log("package.json not found, skipping update")
  }
} catch (error) {
  console.error("Error updating package.json:", error)
}

console.log(`
=== FMT LIBRARY FIX COMPLETE ===

To build your iOS app:

1. Run the patch script:
   $ chmod +x ios/patch-fmt-library.sh
   $ ./ios/patch-fmt-library.sh

2. Clean the build cache:
   $ cd ios
   $ pod deintegrate
   $ pod install --repo-update

3. Start the EAS build:
   $ eas build --profile production --non-interactive

The fix addresses the 'std::char_traits<fmt::internal::char8_type>' error by providing
a complete implementation of the missing template specialization.
`)
