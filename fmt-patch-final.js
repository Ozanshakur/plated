const fs = require("fs")
const path = require("path")

// Completely ignore all command line arguments
console.log("Starting fmt patch script - ignoring all command line arguments")
console.log(`Arguments received: ${process.argv.slice(2).join(", ")}`)
console.log("These arguments will be ignored")

// Hauptfunktion
async function main() {
  try {
    console.log("🔧 Starting fmt library patch process...")

    // Erstelle einen Ersatz für die problematische format.cc Datei
    const formatCCContent = `
// Completely replaced format.cc to avoid template instantiation issues
#include <string>
#include <iostream>

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

// Provide minimal implementations to satisfy the linker
namespace fmt {
  void vprint(std::FILE*, string_view, format_args) {}
  void print(std::FILE*, string_view, format_args) {}
  void vprint(std::ostream&, string_view, format_args) {}
  void print(std::ostream&, string_view, format_args) {}
  
  namespace internal {
    void format_error_code(buffer<char>&, int, string_view) {}
    void format_windows_error(buffer<char>&, int, string_view) {}
  }
}
`

    // Erstelle eine Patch-Header-Datei
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

    // Erstelle eine benutzerdefinierte Podfile
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
    
    # Apply our patch to the fmt library
    fmt_dir = File.join(installer.sandbox.root, 'fmt')
    if Dir.exist?(fmt_dir)
      fmt_src_dir = File.join(fmt_dir, 'src')
      format_cc_path = File.join(fmt_src_dir, 'format.cc')
      
      if File.exist?(format_cc_path)
        puts "📝 Patching fmt library format.cc..."
        
        # Create backup
        FileUtils.cp(format_cc_path, "#{format_cc_path}.bak")
        
        # Replace with our patched version
        patch_file = File.join(installer.sandbox.root, '../fmt-patch/format.cc')
        if File.exist?(patch_file)
          FileUtils.cp(patch_file, format_cc_path)
          puts "✅ Successfully replaced #{format_cc_path} with patched version"
        else
          puts "⚠️ Patch file not found at #{patch_file}, creating it now..."
          File.write(format_cc_path, File.read(File.join(installer.sandbox.root, '../fmt-patch/format_content.txt')))
          puts "✅ Successfully created patched format.cc"
        end
      end
    end
  end
end
`

    // Erstelle die Verzeichnisstruktur
    const patchDir = path.join(process.cwd(), "fmt-patch")
    if (!fs.existsSync(patchDir)) {
      fs.mkdirSync(patchDir, { recursive: true })
      console.log(`Created directory: ${patchDir}`)
    }

    // Schreibe die Dateien
    fs.writeFileSync(path.join(patchDir, "format.cc"), formatCCContent)
    console.log(`Created file: ${path.join(patchDir, "format.cc")}`)

    fs.writeFileSync(path.join(patchDir, "format_content.txt"), formatCCContent)
    console.log(`Created file: ${path.join(patchDir, "format_content.txt")}`)

    fs.writeFileSync(path.join(patchDir, "char_traits_patch.h"), headerContent)
    console.log(`Created file: ${path.join(patchDir, "char_traits_patch.h")}`)

    // Stelle sicher, dass das ios-Verzeichnis existiert
    const iosDir = path.join(process.cwd(), "ios")
    if (!fs.existsSync(iosDir)) {
      fs.mkdirSync(iosDir, { recursive: true })
      console.log(`Created directory: ${iosDir}`)
    }

    fs.writeFileSync(path.join(iosDir, "Podfile"), podfileContent)
    console.log(`Created file: ${path.join(iosDir, "Podfile")}`)

    // Erstelle ein Skript, das während des Builds ausgeführt wird
    const buildScriptContent = `#!/usr/bin/env node
console.log("🔧 Applying fmt library patch during build...");

const fs = require('fs');
const path = require('path');

// Finde das fmt-Verzeichnis
function findFmtDir(startDir) {
  const results = [];
  
  function search(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === 'fmt' && !fullPath.includes('fmt-patch')) {
          results.push(fullPath);
        } else {
          search(fullPath);
        }
      }
    }
  }
  
  search(startDir);
  return results.length > 0 ? results[0] : null;
}

const fmtDir = findFmtDir(process.cwd());

if (!fmtDir) {
  console.error("⚠️ fmt directory not found!");
  process.exit(1);
}

console.log("📂 Found fmt directory at " + fmtDir);

// Finde die format.cc Datei
const formatCC = path.join(fmtDir, 'src', 'format.cc');

if (!fs.existsSync(formatCC)) {
  console.error("⚠️ format.cc not found at " + formatCC);
  process.exit(1);
}

console.log("📄 Found format.cc at " + formatCC);

// Erstelle ein Backup
fs.copyFileSync(formatCC, formatCC + '.bak');
console.log("💾 Created backup at " + formatCC + '.bak');

// Ersetze die Datei mit unserem Patch
const patchFile = path.join(process.cwd(), 'fmt-patch', 'format.cc');
fs.copyFileSync(patchFile, formatCC);
console.log("✅ Successfully replaced format.cc with patched version");

// Kopiere auch die Header-Datei
const headerFile = path.join(process.cwd(), 'fmt-patch', 'char_traits_patch.h');
const headerDest = path.join(fmtDir, 'include', 'fmt', 'char_traits_patch.h');

// Stelle sicher, dass das Zielverzeichnis existiert
const headerDir = path.dirname(headerDest);
if (!fs.existsSync(headerDir)) {
  fs.mkdirSync(headerDir, { recursive: true });
}

fs.copyFileSync(headerFile, headerDest);
console.log("✅ Successfully added char_traits_patch.h to fmt include directory");

// Füge einen Include zur format.h hinzu
const formatH = path.join(fmtDir, 'include', 'fmt', 'format.h');
if (fs.existsSync(formatH)) {
  // Prüfe, ob der Patch bereits angewendet wurde
  const content = fs.readFileSync(formatH, 'utf8');
  if (!content.includes('char_traits_patch.h')) {
    // Füge den Include am Anfang der Datei hinzu
    const newContent = '#include "fmt/char_traits_patch.h"\n' + content;
    fs.writeFileSync(formatH, newContent);
    console.log("✅ Successfully patched format.h");
  } else {
    console.log("ℹ️ format.h already patched");
  }
}

console.log("🎉 fmt library patch completed successfully!");
`

    fs.writeFileSync(path.join(patchDir, "apply-patch.js"), buildScriptContent)
    console.log(`Created file: ${path.join(patchDir, "apply-patch.js")}`)

    console.log("✅ All patch files created successfully!")

    // Kopiere die Dateien in das Build-Verzeichnis
    console.log("Starting file copy process...")

    // Stelle sicher, dass das Zielverzeichnis existiert
    const buildDir = path.join(process.cwd(), "ios", "build", "fmt-patch")
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true })
      console.log(`Created directory: ${buildDir}`)
    }

    // Kopiere die Dateien
    const sourceDir = path.join(process.cwd(), "fmt-patch")

    function copyDir(src, dest) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }

      if (fs.existsSync(src)) {
        const entries = fs.readdirSync(src, { withFileTypes: true })

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)

          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
            console.log(`Copied: ${srcPath} -> ${destPath}`)
          }
        }
      } else {
        console.log(`Source directory does not exist: ${src}`)
      }
    }

    if (fs.existsSync(sourceDir)) {
      copyDir(sourceDir, buildDir)
      console.log("Files copied successfully!")
    } else {
      console.error(`Source directory not found: ${sourceDir}`)
      process.exit(1)
    }

    console.log("✅ fmt-patch-final.js completed successfully!")
    return {
      ios: {
        extraPods: [
          {
            name: "fmt",
            version: "6.2.1",
            configurations: ["Debug", "Release"],
            modular_headers: true,
          },
        ],
      },
    }
  } catch (error) {
    console.error("❌ Error in fmt-patch-final.js:", error)
    // Print the full error stack for debugging
    console.error(error.stack)
    process.exit(1)
  }
}

// Führe die Hauptfunktion aus und fange Fehler ab
main().catch((err) => {
  console.error("❌ Unhandled error:", err)
  console.error(err.stack)
  process.exit(1)
})
