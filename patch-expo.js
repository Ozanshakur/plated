const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Path to Expo.podspec
const expoPath = path.join(process.cwd(), "node_modules", "expo", "Expo.podspec")

// Check if the file exists
if (!fs.existsSync(expoPath)) {
  console.error("Expo.podspec not found. Make sure expo is installed.")
  process.exit(1)
}

// Read the file
let content = fs.readFileSync(expoPath, "utf8")

// Check if the file already contains our patch
if (content.includes("if defined?(get_folly_config)")) {
  console.log("Expo.podspec is already patched.")
  process.exit(0)
}

// Apply the patch
content = content.replace(
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
fs.writeFileSync(expoPath, content)

console.log("Successfully patched Expo.podspec")

// Create patches directory if it doesn't exist
const patchesDir = path.join(process.cwd(), "patches")
if (!fs.existsSync(patchesDir)) {
  fs.mkdirSync(patchesDir)
}

// Create the expo patch directory if it doesn't exist
const expoPatchDir = path.join(patchesDir, "expo+50.0.0")
if (!fs.existsSync(expoPatchDir)) {
  fs.mkdirSync(expoPatchDir, { recursive: true })
}

// Create a patch file for reference
const patchContent = `diff --git a/node_modules/expo/Expo.podspec b/node_modules/expo/Expo.podspec
index abcdefg..hijklmn 100644
--- a/node_modules/expo/Expo.podspec
+++ b/node_modules/expo/Expo.podspec
@@ -18,7 +18,13 @@ Pod::Spec.new do |s|
   s.source_files = "ios/**/*.{h,m,mm,swift}"
   s.exclude_files = "ios/Exponent/Supporting/**"

-  compiler_flags = get_folly_config()[:compiler_flags]
+  # Define folly config directly if get_folly_config is not available
+  compiler_flags = begin
+    if defined?(get_folly_config)
+      get_folly_config()[:compiler_flags]
+    else
+      "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
+    end
+  end

   s.pod_target_xcconfig = {
     "USE_HEADERMAP" => "YES",`

fs.writeFileSync(path.join(patchesDir, "expo+50.0.0.patch"), patchContent)

console.log("Created patch file for reference")
console.log("You can now continue development on Windows")
