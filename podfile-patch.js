const fs = require("fs")
const path = require("path")

// Pfad zur Podfile
const podfilePath = path.join("ios", "Podfile")

console.log("Patching Podfile...")

// Überprüfen, ob die Datei existiert
if (fs.existsSync(podfilePath)) {
  // Dateiinhalt lesen
  let podfileContent = fs.readFileSync(podfilePath, "utf8")

  // Hermes deaktivieren
  podfileContent = podfileContent.replace(
    /use_react_native!.*hermes_enabled.*true/m,
    "use_react_native!(hermes_enabled: false)",
  )

  // fmt-Version festlegen und C++11 Standard erzwingen
  podfileContent =
    podfileContent +
    `
# Fix fmt library issues
pod 'fmt', '~> 6.2.1', :modular_headers => true

post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++11'
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_NONTYPE_TEMPLATE_PARAMETERS=0'
      end
    end
  end
end
`

  // Geänderten Inhalt zurückschreiben
  fs.writeFileSync(podfilePath, podfileContent)
  console.log("Podfile successfully patched!")
} else {
  console.log(`Podfile not found at path: ${podfilePath}`)
  console.log(
    "This is normal if you are running this script locally. The Podfile will be patched during the EAS build process.",
  )
}

// Erstelle die Verzeichnisstruktur für die iOS-Skripte
const iosDir = path.join("ios")
if (!fs.existsSync(iosDir)) {
  fs.mkdirSync(iosDir)
}

// Erstelle die fmt-Patch-Datei
const fmtPatchPath = path.join(iosDir, "fmt-patch.cpp")
const fmtPatchContent = `// Diese Datei wird die problematische fmt-Bibliothek ersetzen
#include <string>
#include <iostream>

namespace fmt {
    namespace internal {
        typedef char char8_type;
    }
}

namespace std {
    template <>
    struct char_traits<fmt::internal::char8_type> {
        typedef fmt::internal::char8_type char_type;
        typedef int int_type;
        typedef std::streampos pos_type;
        typedef std::streamoff off_type;
        typedef std::mbstate_t state_type;

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
            return std::memcmp(s1, s2, n);
        }

        static size_t length(const char_type* s) {
            return std::strlen(s);
        }

        static const char_type* find(const char_type* s, size_t n, const char_type& a) {
            return static_cast<const char_type*>(std::memchr(s, a, n));
        }

        static char_type* move(char_type* s1, const char_type* s2, size_t n) {
            return static_cast<char_type*>(std::memmove(s1, s2, n));
        }

        static char_type* copy(char_type* s1, const char_type* s2, size_t n) {
            return static_cast<char_type*>(std::memcpy(s1, s2, n));
        }

        static char_type* assign(char_type* s, size_t n, char_type a) {
            return static_cast<char_type*>(std::memset(s, a, n));
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
fs.writeFileSync(fmtPatchPath, fmtPatchContent)
console.log("Created fmt-patch.cpp")

// Erstelle das Fix-Skript
const fixScriptPath = path.join(iosDir, "fix-fmt-library.sh")
const fixScriptContent = `#!/bin/bash
echo "Fixing fmt library issues during EAS build..."

# Finde die problematische Datei
FMT_DIR=\$(find . -type d -name "fmt" | grep -v "node_modules" | head -n 1)
if [ -z "$FMT_DIR" ]; then
  echo "fmt directory not found"
  exit 1
fi

# Erstelle ein Backup der originalen Datei
FORMAT_CC="$FMT_DIR/src/format.cc"
if [ -f "$FORMAT_CC" ]; then
  cp "$FORMAT_CC" "\${FORMAT_CC}.bak"
  echo "Created backup of $FORMAT_CC"
  
  # Füge unsere Implementierung am Anfang der Datei ein
  cat ios/fmt-patch.cpp > "$FORMAT_CC.new"
  cat "$FORMAT_CC" >> "$FORMAT_CC.new"
  mv "$FORMAT_CC.new" "$FORMAT_CC"
  echo "Patched $FORMAT_CC"
else
  echo "format.cc not found in $FMT_DIR/src"
  exit 1
fi

# Deaktiviere Hermes in der Podfile
PODFILE="ios/Podfile"
if [ -f "$PODFILE" ]; then
  sed -i '' 's/use_react_native!.*hermes_enabled.*true/use_react_native!(hermes_enabled: false)/g' "$PODFILE"
  echo "Disabled Hermes in Podfile"
else
  echo "Podfile not found at $PODFILE"
  exit 1
fi

echo "Fix completed successfully!"
`
fs.writeFileSync(fixScriptPath, fixScriptContent)

// Mache das Skript ausführbar (funktioniert nur auf Unix-Systemen)
try {
  fs.chmodSync(fixScriptPath, "755")
  console.log("Made the script executable")
} catch (error) {
  console.log("Could not make the script executable. This is normal on Windows.")
  console.log("The script will be made executable during the EAS build process.")
}

console.log("Created fix-fmt-library.sh script")
