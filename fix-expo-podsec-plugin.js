const fs = require("fs")
const path = require("path")

// This is a custom Expo config plugin
module.exports = function fixExpoPodspecPlugin(config, { enabled = true } = {}) {
  if (!enabled) {
    return config
  }

  return {
    ...config,
    // Add a hook that will run after the project is created
    hooks: {
      ...(config.hooks || {}),
      postExport: [
        async (config) => {
          console.log("Running fix-expo-podspec-plugin")

          // Try to find the Expo.podspec file
          const expoPodspecPath = path.join(process.cwd(), "node_modules", "expo", "Expo.podspec")

          if (fs.existsSync(expoPodspecPath)) {
            console.log(`Found Expo.podspec at ${expoPodspecPath}`)

            try {
              const content = fs.readFileSync(expoPodspecPath, "utf8")

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

                fs.writeFileSync(expoPodspecPath, patchedContent)
                console.log("Successfully patched Expo.podspec")
              } else {
                console.log("The problematic line was not found in Expo.podspec")
              }
            } catch (error) {
              console.error("Error patching Expo.podspec:", error)
            }
          } else {
            console.log("Could not find Expo.podspec file")
          }

          return config
        },
        ...(config.hooks?.postExport || []),
      ],
    },
  }
}
