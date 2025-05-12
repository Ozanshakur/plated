const fs = require("fs")
const path = require("path")

console.log("Running fix-expo-podspec.js")

// Function to find files recursively
function findFiles(dir, fileName, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && !filePath.includes("node_modules/.cache")) {
      findFiles(filePath, fileName, fileList)
    } else if (file === fileName) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// Function to patch the Expo.podspec file
function patchExpoPodspec(filePath) {
  console.log(`Found Expo.podspec at ${filePath}`)

  try {
    const content = fs.readFileSync(filePath, "utf8")

    // Check if the file contains the problematic line
    if (content.includes("compiler_flags = get_folly_config()[:compiler_flags]")) {
      console.log("Found problematic line, patching...")

      // Add the missing get_folly_config function
      const patchedContent = content.replace(
        "compiler_flags = get_folly_config()[:compiler_flags]",
        `# Define the missing get_folly_config function
def get_folly_config
  { :compiler_flags => ['-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73'] }
end

compiler_flags = get_folly_config()[:compiler_flags]`,
      )

      fs.writeFileSync(filePath, patchedContent)
      console.log("Successfully patched Expo.podspec")
      return true
    } else {
      console.log("The problematic line was not found in Expo.podspec")
      return false
    }
  } catch (error) {
    console.error("Error patching Expo.podspec:", error)
    return false
  }
}

// Function to patch the Podfile
function patchPodfile(filePath) {
  console.log(`Found Podfile at ${filePath}`)

  try {
    const content = fs.readFileSync(filePath, "utf8")

    // Check if the file contains the problematic line
    if (content.includes("config = use_native_modules!(config_command)")) {
      console.log("Found problematic line in Podfile, patching...")

      // Replace the problematic line
      const patchedContent = content.replace(
        "config = use_native_modules!(config_command)",
        "config = use_native_modules!",
      )

      fs.writeFileSync(filePath, patchedContent)
      console.log("Successfully patched Podfile")
      return true
    } else {
      console.log("The problematic line was not found in Podfile")
      return false
    }
  } catch (error) {
    console.error("Error patching Podfile:", error)
    return false
  }
}

// Try to find and patch Expo.podspec
console.log("Searching for Expo.podspec...")
const expoPodspecPaths = findFiles(process.cwd(), "Expo.podspec")

if (expoPodspecPaths.length > 0) {
  let patchedAny = false

  for (const filePath of expoPodspecPaths) {
    const patched = patchExpoPodspec(filePath)
    patchedAny = patchedAny || patched
  }

  if (!patchedAny) {
    console.log("Could not patch any Expo.podspec files")
  }
} else {
  console.log("Could not find any Expo.podspec files")
}

// Try to find and patch Podfile
console.log("Searching for Podfile...")
const podfilePaths = findFiles(process.cwd(), "Podfile")

if (podfilePaths.length > 0) {
  let patchedAny = false

  for (const filePath of podfilePaths) {
    const patched = patchPodfile(filePath)
    patchedAny = patchedAny || patched
  }

  if (!patchedAny) {
    console.log("Could not patch any Podfile files")
  }
} else {
  console.log("Could not find any Podfile files")
}

console.log("fix-expo-podspec.js completed")
