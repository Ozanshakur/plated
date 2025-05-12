const fs = require("fs")
const path = require("path")

// Function to patch the Expo.podspec file
function patchExpoPodspec() {
  try {
    // Path to Expo.podspec
    const expoPath = path.join(process.cwd(), "node_modules", "expo", "Expo.podspec")

    // Check if the file exists
    if (!fs.existsSync(expoPath)) {
      console.log("Expo.podspec not found. Skipping patch.")
      return
    }

    // Read the file
    const content = fs.readFileSync(expoPath, "utf8")

    // Check if the file already contains our patch
    if (content.includes("if defined?(get_folly_config)")) {
      console.log("Expo.podspec is already patched.")
      return
    }

    // Apply the patch
    const patchedContent = content.replace(
      "compiler_flags = get_folly_config()[:compiler_flags]",
      `# Define folly config directly if get_folly_config is not available
  compiler_flags = begin
    if defined?(get_folly_config)
      get_folly_config()[:compiler_flags]
    else
      "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
    end
  end`,
    )

    // Write the file back
    fs.writeFileSync(expoPath, patchedContent)
    console.log("Successfully patched Expo.podspec")
  } catch (error) {
    console.error("Error patching Expo.podspec:", error)
  }
}

// Run the patch function
patchExpoPodspec()
