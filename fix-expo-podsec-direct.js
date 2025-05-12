const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🔍 Starting fix-expo-podspec-direct.js")

// Function to find the Expo.podspec file
function findExpoPodspec() {
  // Common paths where Expo.podspec might be located
  const possiblePaths = [
    path.join(process.cwd(), "node_modules", "expo", "Expo.podspec"),
    "/Users/expo/workingdir/build/node_modules/expo/Expo.podspec",
    path.join(process.cwd(), "..", "node_modules", "expo", "Expo.podspec"),
  ]

  for (const podspecPath of possiblePaths) {
    console.log(`Checking for Expo.podspec at: ${podspecPath}`)
    if (fs.existsSync(podspecPath)) {
      console.log(`✅ Found Expo.podspec at: ${podspecPath}`)
      return podspecPath
    }
  }

  // If not found in common paths, try to find it using find command
  try {
    console.log("Trying to find Expo.podspec using find command...")
    const result = execSync('find /Users/expo/workingdir -name "Expo.podspec" 2>/dev/null || true', {
      encoding: "utf8",
    })
    const paths = result.trim().split("\n").filter(Boolean)

    if (paths.length > 0) {
      console.log(`✅ Found Expo.podspec at: ${paths[0]}`)
      return paths[0]
    }
  } catch (error) {
    console.log("Error using find command:", error.message)
  }

  console.log("❌ Could not find Expo.podspec")
  return null
}

// Function to patch the Expo.podspec file
function patchExpoPodspec(filePath) {
  try {
    console.log(`📝 Reading Expo.podspec from: ${filePath}`)
    const content = fs.readFileSync(filePath, "utf8")

    // Check if the file already contains our patch
    if (content.includes("def get_folly_config")) {
      console.log("✅ Expo.podspec is already patched")
      return true
    }

    // Check if the file contains the problematic line
    if (content.includes("compiler_flags = get_folly_config()[:compiler_flags]")) {
      console.log("🔧 Found problematic line, patching...")

      // Create the patched content
      const patchedContent = content.replace(
        "compiler_flags = get_folly_config()[:compiler_flags]",
        `# Define the missing get_folly_config function
def get_folly_config
  { :compiler_flags => ['-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73'] }
end

compiler_flags = get_folly_config()[:compiler_flags]`,
      )

      // Write the patched content back to the file
      console.log("💾 Writing patched Expo.podspec")
      fs.writeFileSync(filePath, patchedContent)
      console.log("✅ Successfully patched Expo.podspec")
      return true
    } else {
      console.log("❓ The problematic line was not found in Expo.podspec")
      return false
    }
  } catch (error) {
    console.error("❌ Error patching Expo.podspec:", error)
    return false
  }
}

// Function to find the Podfile
function findPodfile() {
  // Common paths where Podfile might be located
  const possiblePaths = [path.join(process.cwd(), "ios", "Podfile"), "/Users/expo/workingdir/build/ios/Podfile"]

  for (const podfilePath of possiblePaths) {
    console.log(`Checking for Podfile at: ${podfilePath}`)
    if (fs.existsSync(podfilePath)) {
      console.log(`✅ Found Podfile at: ${podfilePath}`)
      return podfilePath
    }
  }

  // If not found in common paths, try to find it using find command
  try {
    console.log("Trying to find Podfile using find command...")
    const result = execSync('find /Users/expo/workingdir -name "Podfile" 2>/dev/null || true', { encoding: "utf8" })
    const paths = result.trim().split("\n").filter(Boolean)

    if (paths.length > 0) {
      console.log(`✅ Found Podfile at: ${paths[0]}`)
      return paths[0]
    }
  } catch (error) {
    console.log("Error using find command:", error.message)
  }

  console.log("❌ Could not find Podfile")
  return null
}

// Function to patch the Podfile
function patchPodfile(filePath) {
  try {
    console.log(`📝 Reading Podfile from: ${filePath}`)
    const content = fs.readFileSync(filePath, "utf8")

    // Check if the file contains the problematic line
    if (content.includes("config = use_native_modules!(config_command)")) {
      console.log("🔧 Found problematic line in Podfile, patching...")

      // Create the patched content
      const patchedContent = content.replace(
        "config = use_native_modules!(config_command)",
        "config = use_native_modules!",
      )

      // Write the patched content back to the file
      console.log("💾 Writing patched Podfile")
      fs.writeFileSync(filePath, patchedContent)
      console.log("✅ Successfully patched Podfile")
      return true
    } else {
      console.log("❓ The problematic line was not found in Podfile")
      return false
    }
  } catch (error) {
    console.error("❌ Error patching Podfile:", error)
    return false
  }
}

// Main function
async function main() {
  console.log("🚀 Starting patch process")

  // Try to patch Expo.podspec
  const expoPodspecPath = findExpoPodspec()
  if (expoPodspecPath) {
    patchExpoPodspec(expoPodspecPath)
  }

  // Try to patch Podfile
  const podfilePath = findPodfile()
  if (podfilePath) {
    patchPodfile(podfilePath)
  }

  console.log("🏁 Patch process completed")
}

// Run the main function
main().catch((error) => {
  console.error("❌ Unhandled error:", error)
  process.exit(1)
})
