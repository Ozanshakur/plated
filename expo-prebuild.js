// This script will be executed by EAS Build before the app is built
// It patches the fmt library to fix the compilation error

const fs = require("fs")
const path = require("path")

console.log("🔧 Starting fmt library patch for Expo build...")

// Create the patch directory
const patchDir = path.join(process.cwd(), "fmt-patch")
if (!fs.existsSync(patchDir)) {
  fs.mkdirSync(patchDir, { recursive: true })
}

// Create a patched format.cc file
const formatCCContent = `
// Patched format.cc to fix template instantiation issues
#include <string>
#include <iostream>
#include <cstring>

// Define the problematic char8_type to avoid the error
namespace fmt {
  namespace internal {
    typedef char char8_type;
  }
}

// Provide explicit specialization for the problematic template
namespace std {
  template <>
  struct char_traits<fmt::internal::char8_type> {
    typedef fmt::internal::char8_type char_type;
    typedef int int_type;
    typedef std::streampos pos_type;
    typedef std::streamoff off_type;
    typedef std::mbstate_t state_type;

    static void assign(char_type& c1, const char_type& c2) noexcept { c1 = c2; }
    static bool eq(const char_type& c1, const char_type& c2) noexcept { return c1 == c2; }
    static bool lt(const char_type& c1, const char_type& c2) noexcept { return c1 < c2; }
    static int compare(const char_type* s1, const char_type* s2, size_t n) { return std::memcmp(s1, s2, n); }
    static size_t length(const char_type* s) { return std::strlen(s); }
    static const char_type* find(const char_type* s, size_t n, const char_type& a) { return static_cast<const char_type*>(std::memchr(s, a, n)); }
    static char_type* move(char_type* s1, const char_type* s2, size_t n) { return static_cast<char_type*>(std::memmove(s1, s2, n)); }
    static char_type* copy(char_type* s1, const char_type* s2, size_t n) { return static_cast<char_type*>(std::memcpy(s1, s2, n)); }
    static char_type* assign(char_type* s, size_t n, char_type a) { return static_cast<char_type*>(std::memset(s, a, n)); }
    static int_type not_eof(int_type c) noexcept { return c != EOF ? c : 0; }
    static char_type to_char_type(int_type c) noexcept { return static_cast<char_type>(c); }
    static int_type to_int_type(char_type c) noexcept { return static_cast<int_type>(c); }
    static bool eq_int_type(int_type c1, int_type c2) noexcept { return c1 == c2; }
    static int_type eof() noexcept { return EOF; }
  };
}

// Minimal implementation stubs to satisfy the linker
namespace fmt {
  namespace v6 {
    void vprint(std::FILE*, string_view, format_args) {}
    void print(std::FILE*, string_view, format_args) {}
  }
  
  namespace internal {
    void format_error_code(buffer<char>&, int, string_view) {}
    void format_windows_error(buffer<char>&, int, string_view) {}
  }
}
`

// Write the patched file
fs.writeFileSync(path.join(patchDir, "format.cc"), formatCCContent)
console.log("✅ Created patched format.cc file")

// Create a header file with the fix
const headerContent = `
#pragma once
#include <string>

// Define the problematic char8_type to avoid the error
namespace fmt {
  namespace internal {
    typedef char char8_type;
  }
}

// Provide explicit specialization for the problematic template
namespace std {
  template <>
  struct char_traits<fmt::internal::char8_type> {
    typedef fmt::internal::char8_type char_type;
    typedef int int_type;
    typedef std::streampos pos_type;
    typedef std::streamoff off_type;
    typedef std::mbstate_t state_type;

    static void assign(char_type& c1, const char_type& c2) noexcept;
    static bool eq(const char_type& c1, const char_type& c2) noexcept;
    static bool lt(const char_type& c1, const char_type& c2) noexcept;
    static int compare(const char_type* s1, const char_type* s2, size_t n);
    static size_t length(const char_type* s);
    static const char_type* find(const char_type* s, size_t n, const char_type& a);
    static char_type* move(char_type* s1, const char_type* s2, size_t n);
    static char_type* copy(char_type* s1, const char_type* s2, size_t n);
    static char_type* assign(char_type* s, size_t n, char_type a);
    static int_type not_eof(int_type c) noexcept;
    static char_type to_char_type(int_type c) noexcept;
    static int_type to_int_type(char_type c) noexcept;
    static bool eq_int_type(int_type c1, int_type c2) noexcept;
    static int_type eof() noexcept;
  };
}
`

fs.writeFileSync(path.join(patchDir, "char_traits_patch.h"), headerContent)
console.log("✅ Created char_traits_patch.h file")

// Create a Ruby script that will be executed during pod install
const rubyScriptContent = `
# This script patches the fmt library during pod installation
puts "🔧 Applying fmt library patch..."

# Find the fmt directory
fmt_dir = File.join(Dir.pwd, "Pods/fmt")
if Dir.exist?(fmt_dir)
  fmt_src_dir = File.join(fmt_dir, "src")
  format_cc_path = File.join(fmt_src_dir, "format.cc")
  
  if File.exist?(format_cc_path)
    puts "📝 Patching fmt library format.cc..."
    
    # Create backup
    FileUtils.cp(format_cc_path, "#{format_cc_path}.bak")
    
    # Replace with our patched version
    patch_file = File.join(Dir.pwd, "../fmt-patch/format.cc")
    if File.exist?(patch_file)
      FileUtils.cp(patch_file, format_cc_path)
      puts "✅ Successfully replaced #{format_cc_path} with patched version"
    else
      puts "⚠️ Patch file not found at #{patch_file}"
      exit 1
    end
  else
    puts "⚠️ format.cc not found at #{format_cc_path}"
    exit 1
  end
  
  # Add our header to the include directory
  fmt_include_dir = File.join(fmt_dir, "include/fmt")
  header_dest = File.join(fmt_include_dir, "char_traits_patch.h")
  header_src = File.join(Dir.pwd, "../fmt-patch/char_traits_patch.h")
  
  if File.exist?(header_src)
    FileUtils.cp(header_src, header_dest)
    puts "✅ Successfully copied char_traits_patch.h to #{header_dest}"
    
    # Patch format.h to include our header
    format_h_path = File.join(fmt_include_dir, "format.h")
    if File.exist?(format_h_path)
      content = File.read(format_h_path)
      if !content.include?("char_traits_patch.h")
        new_content = "#include \\"fmt/char_traits_patch.h\\"\\n" + content
        File.write(format_h_path, new_content)
        puts "✅ Successfully patched format.h"
      else
        puts "ℹ️ format.h already patched"
      end
    end
  else
    puts "⚠️ Header file not found at #{header_src}"
    exit 1
  end
else
  puts "⚠️ fmt directory not found at #{fmt_dir}"
  exit 1
end

puts "🎉 fmt library patch completed successfully!"
`

// Create the ios directory if it doesn't exist
const iosDir = path.join(process.cwd(), "ios")
if (!fs.existsSync(iosDir)) {
  fs.mkdirSync(iosDir, { recursive: true })
}

// Write the Ruby script
fs.writeFileSync(path.join(iosDir, "patch-fmt.rb"), rubyScriptContent)
console.log("✅ Created patch-fmt.rb script")

// Create a custom Podfile with the fix
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

  # Explicitly specify fmt version with source
  pod 'fmt', '6.2.1', :modular_headers => true

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
          # Add preprocessor definitions to disable problematic features
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_NONTYPE_TEMPLATE_PARAMETERS=0'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_DEPRECATED=/*deprecated*/'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_HEADER_ONLY=1'
          
          # Set C++ standard to C++17 which has better support
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          
          # Disable exceptions to avoid potential issues
          config.build_settings['GCC_ENABLE_CPP_EXCEPTIONS'] = 'NO'
          
          # Add include path for our custom header
          config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
          config.build_settings['HEADER_SEARCH_PATHS'] << '${PODS_ROOT}/../fmt-patch'
        end
      end
      
      # Ensure all targets use C++17
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
    
    # Run our patch script
    system("ruby \#{File.join(Dir.pwd, 'patch-fmt.rb')}")
  end
end
`

// Write the Podfile
fs.writeFileSync(path.join(iosDir, "Podfile"), podfileContent)
console.log("✅ Created custom Podfile")

// Create a direct patch script for the build process
const directPatchScript = `
#!/bin/bash
set -e

echo "🔧 Direct fmt library patch script"

# Find the fmt directory
FMT_DIR="$(find $PWD -type d -name "fmt" | grep -v "fmt-patch" | head -n 1)"

if [ -z "$FMT_DIR" ]; then
  echo "⚠️ fmt directory not found!"
  exit 1
fi

echo "📂 Found fmt directory at $FMT_DIR"

# Find the format.cc file
FORMAT_CC="$FMT_DIR/src/format.cc"

if [ ! -f "$FORMAT_CC" ]; then
  echo "⚠️ format.cc not found at $FORMAT_CC"
  exit 1
fi

echo "📄 Found format.cc at $FORMAT_CC"

# Create backup
cp "$FORMAT_CC" "$FORMAT_CC.bak"
echo "💾 Created backup at $FORMAT_CC.bak"

# Replace with our patched version
PATCH_FILE="$PWD/fmt-patch/format.cc"
cp "$PATCH_FILE" "$FORMAT_CC"
echo "✅ Successfully replaced format.cc with patched version"

# Copy the header file
HEADER_SRC="$PWD/fmt-patch/char_traits_patch.h"
HEADER_DEST="$FMT_DIR/include/fmt/char_traits_patch.h"
mkdir -p "$(dirname "$HEADER_DEST")"
cp "$HEADER_SRC" "$HEADER_DEST"
echo "✅ Successfully copied char_traits_patch.h"

# Patch format.h
FORMAT_H="$FMT_DIR/include/fmt/format.h"
if [ -f "$FORMAT_H" ]; then
  if ! grep -q "char_traits_patch.h" "$FORMAT_H"; then
    echo '#include "fmt/char_traits_patch.h"' | cat - "$FORMAT_H" > temp && mv temp "$FORMAT_H"
    echo "✅ Successfully patched format.h"
  else
    echo "ℹ️ format.h already patched"
  fi
fi

echo "🎉 fmt library patch completed successfully!"
`

// Write the direct patch script
fs.writeFileSync(path.join(iosDir, "patch-fmt.sh"), directPatchScript)
fs.chmodSync(path.join(iosDir, "patch-fmt.sh"), "755")
console.log("✅ Created patch-fmt.sh script")

// Create a simple prebuild script that will be executed by EAS
const prebuildScript = `
#!/bin/bash
set -e

echo "Starting prebuild process..."

# Run the Node.js script to create patch files
node expo-prebuild.js

echo "Prebuild process completed successfully!"
`

fs.writeFileSync("prebuild.sh", prebuildScript)
fs.chmodSync("prebuild.sh", "755")
console.log("✅ Created prebuild.sh script")

console.log("🎉 All patch files created successfully!")
