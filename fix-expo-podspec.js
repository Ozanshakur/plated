const fs = require("fs")
const path = require("path")

// Function to find the Expo.podspec file
function findExpoPodspec() {
  const nodeModulesPath = path.join(process.cwd(), "node_modules")
  const expoPodspecPath = path.join(nodeModulesPath, "expo", "Expo.podspec")

  if (fs.existsSync(expoPodspecPath)) {
    return expoPodspecPath
  }

  // If we're in an EAS build environment, check the workingdir path
  if (process.env.EAS_BUILD === "true") {
    const easBuildPath = "/Users/expo/workingdir/build/node_modules/expo/Expo.podspec"
    if (fs.existsSync(easBuildPath)) {
      return easBuildPath
    }
  }

  console.log("Could not find Expo.podspec file")
  return null
}

// Function to patch the Expo.podspec file
function patchExpoPodspec(podspecPath) {
  console.log(`Patching Expo.podspec at ${podspecPath}`)

  try {
    const content = fs.readFileSync(podspecPath, "utf8")

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

      fs.writeFileSync(podspecPath, patchedContent)
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

// Function to patch the ExpoModulesCore.podspec file
function patchExpoModulesCorePodspec() {
  try {
    // Path to ExpoModulesCore.podspec
    const expoModulesCorePath = path.join(process.cwd(), "node_modules", "expo-modules-core", "ExpoModulesCore.podspec")

    // Check if the file exists
    if (fs.existsSync(expoModulesCorePath)) {
      // Read the file
      const coreContent = fs.readFileSync(expoModulesCorePath, "utf8")

      // Check if the file already contains our patch
      if (coreContent.includes("if defined?(get_folly_config)")) {
        console.log("ExpoModulesCore.podspec is already patched.")
      } else {
        // Apply the patch
        const patchedCoreContent = coreContent.replace(
          "compiler_flags = get_folly_config()[:compiler_flags] + ' ' + \"-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}\"",
          `# Define folly config directly if get_folly_config is not available
  compiler_flags = begin
    if defined?(get_folly_config)
      get_folly_config()[:compiler_flags]
    else
      "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
    end
  end + ' ' + "-DREACT_NATIVE_TARGET_VERSION=#{reactNativeTargetVersion}"`,
        )

        // Write the file back
        fs.writeFileSync(expoModulesCorePath, patchedCoreContent)
        console.log("Successfully patched ExpoModulesCore.podspec")
      }
    } else {
      console.log("ExpoModulesCore.podspec not found. Skipping patch.")
    }
  } catch (error) {
    console.error("Error patching podspec files:", error)
  }
}

// Main function
function main() {
  console.log("Starting Expo.podspec patch script")

  const podspecPath = findExpoPodspec()
  if (podspecPath) {
    const patched = patchExpoPodspec(podspecPath)
    if (patched) {
      console.log("Expo.podspec patched successfully")
    } else {
      console.log("Failed to patch Expo.podspec")
    }
  }

  patchExpoModulesCorePodspec()
}

// Run the main function
main()
