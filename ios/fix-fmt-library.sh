#!/bin/bash
echo "Fixing fmt library issues during EAS build..."

# Erstelle Verzeichnis für den Patch
mkdir -p ios/patches

# Erstelle eine Datei, die die fmt-Bibliothek patcht
cat > ios/patches/fmt-patch.cpp << 'EOL'
// Diese Datei wird die problematische fmt-Bibliothek ersetzen
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
EOL

# Finde die problematische Datei
echo "Searching for fmt directory..."
FMT_DIR=$(find . -type d -name "fmt" | grep -v "node_modules" | head -n 1)
if [ -z "$FMT_DIR" ]; then
  echo "fmt directory not found, will try during pod install"
else
  # Erstelle ein Backup der originalen Datei
  FORMAT_CC="$FMT_DIR/src/format.cc"
  if [ -f "$FORMAT_CC" ]; then
    cp "$FORMAT_CC" "${FORMAT_CC}.bak"
    echo "Created backup of $FORMAT_CC"
    
    # Füge unsere Implementierung am Anfang der Datei ein
    cat ios/patches/fmt-patch.cpp > "$FORMAT_CC.new"
    cat "$FORMAT_CC" >> "$FORMAT_CC.new"
    mv "$FORMAT_CC.new" "$FORMAT_CC"
    echo "Patched $FORMAT_CC"
  else
    echo "format.cc not found in $FMT_DIR/src, will try during pod install"
  fi
fi

# Erstelle eine angepasste Podfile
echo "Creating custom Podfile..."
PODFILE="ios/Podfile"
if [ -f "$PODFILE" ]; then
  cp "$PODFILE" "${PODFILE}.bak"
  echo "Created backup of $PODFILE"
  
  # Modifiziere die Podfile
  sed -i.bak 's/use_react_native.*/use_react_native!(hermes_enabled: false)/g' "$PODFILE"
  
  # Füge zusätzliche Konfigurationen für fmt hinzu
  cat >> "$PODFILE" << 'EOL'

# Spezielle Konfiguration für fmt-Bibliothek
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_NONTYPE_TEMPLATE_PARAMETERS=0'
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++11'
        
        # Füge unsere Patch-Datei als Prefix-Header hinzu
        patch_path = File.join(Dir.pwd, 'ios/patches/fmt-patch.cpp')
        if File.exist?(patch_path)
          config.build_settings['GCC_PREFIX_HEADER'] = patch_path
        end
      end
    end
  end
end
EOL
  
  echo "Modified $PODFILE"
else
  echo "Podfile not found at $PODFILE, will be created during prebuild"
fi

echo "Fix completed successfully!"
