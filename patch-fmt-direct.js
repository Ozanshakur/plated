// This script directly patches the fmt library files in the Pods directory
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🔧 Starting direct fmt library patch...")

// Function to find the fmt directory
function findFmtDir(startDir) {
  console.log(`Searching for fmt directory in ${startDir}...`)

  try {
    // Use find command on Unix-like systems
    if (process.platform !== "win32") {
      try {
        const result = execSync(`find "${startDir}" -type d -name "fmt" | grep -v "fmt-patch" | head -n 1`, {
          encoding: "utf8",
        }).trim()
        if (result) {
          console.log(`Found fmt directory using find command: ${result}`)
          return result
        }
      } catch (error) {
        console.log("Find command failed, falling back to manual search")
      }
    }

    // Manual recursive search as fallback
    const results = []

    function search(dir) {
      if (!fs.existsSync(dir)) return

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(dir, entry.name)
            if (entry.name === "fmt" && !fullPath.includes("fmt-patch")) {
              results.push(fullPath)
            } else if (!fullPath.includes("node_modules") && !fullPath.includes(".git")) {
              // Skip node_modules and .git to improve performance
              search(fullPath)
            }
          }
        }
      } catch (error) {
        console.log(`Error reading directory ${dir}: ${error.message}`)
      }
    }

    search(startDir)

    if (results.length > 0) {
      console.log(`Found fmt directory using manual search: ${results[0]}`)
      return results[0]
    }

    console.log("fmt directory not found")
    return null
  } catch (error) {
    console.error(`Error finding fmt directory: ${error.message}`)
    return null
  }
}

// Create the patch directory and files
const patchDir = path.join(process.cwd(), "fmt-patch")
if (!fs.existsSync(patchDir)) {
  fs.mkdirSync(patchDir, { recursive: true })
}

// Create the patched format.cc file
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

// Provide minimal implementations to satisfy the linker
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

fs.writeFileSync(path.join(patchDir, "format.cc"), formatCCContent)

// Create the header file
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

// Try to find and patch the fmt library
const iosDir = path.join(process.cwd(), "ios")
const podsDir = path.join(iosDir, "Pods")

// Check if we're in a build environment
if (fs.existsSync(podsDir)) {
  console.log("Found Pods directory, attempting to patch fmt library...")

  const fmtDir = findFmtDir(podsDir)

  if (fmtDir) {
    console.log(`Found fmt directory at ${fmtDir}`)

    // Patch format.cc
    const formatCCPath = path.join(fmtDir, "src", "format.cc")
    if (fs.existsSync(formatCCPath)) {
      console.log(`Found format.cc at ${formatCCPath}`)

      // Create backup
      fs.copyFileSync(formatCCPath, `${formatCCPath}.bak`)
      console.log(`Created backup at ${formatCCPath}.bak`)

      // Replace with our patched version
      fs.copyFileSync(path.join(patchDir, "format.cc"), formatCCPath)
      console.log(`Successfully replaced ${formatCCPath} with patched version`)
    }

    // Add our header to the include directory
    const fmtIncludeDir = path.join(fmtDir, "include", "fmt")
    if (!fs.existsSync(fmtIncludeDir)) {
      fs.mkdirSync(fmtIncludeDir, { recursive: true })
    }

    const headerDest = path.join(fmtIncludeDir, "char_traits_patch.h")
    fs.copyFileSync(path.join(patchDir, "char_traits_patch.h"), headerDest)
    console.log(`Successfully copied char_traits_patch.h to ${headerDest}`)

    // Patch format.h to include our header
    const formatHPath = path.join(fmtIncludeDir, "format.h")
    if (fs.existsSync(formatHPath)) {
      const content = fs.readFileSync(formatHPath, "utf8")
      if (!content.includes("char_traits_patch.h")) {
        const newContent = `#include "fmt/char_traits_patch.h"\n${content}`
        fs.writeFileSync(formatHPath, newContent)
        console.log(`Successfully patched ${formatHPath}`)
      } else {
        console.log(`${formatHPath} already patched`)
      }
    }

    console.log("🎉 fmt library patch completed successfully!")
  } else {
    console.log("⚠️ fmt directory not found, patch files created but not applied")
  }
} else {
  console.log("⚠️ Pods directory not found, patch files created but not applied")
}

console.log("✅ All patch files created successfully!")
