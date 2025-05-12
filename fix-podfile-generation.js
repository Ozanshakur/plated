const fs = require("fs")
const path = require("path")

// Function to find and patch the file that generates the problematic Podfile
function patchPodfileGenerator() {
  console.log("🔍 Searching for files that generate Podfile...")

  // Path to the expo-cli directory in node_modules
  const expoPaths = [
    path.join(process.cwd(), "node_modules", "@expo", "cli"),
    path.join(process.cwd(), "node_modules", "expo-cli"),
    path.join(process.cwd(), "node_modules", "expo"),
  ]

  // Files that might contain the problematic code
  const potentialFiles = [
    "src/commands/prebuild/ios/podfileTemplate.ts",
    "src/commands/prebuild/ios/Podfile",
    "scripts/template-files/ios/Podfile",
    "template-files/ios/Podfile",
    "scripts/ios-podfile-template.rb",
    "scripts/ios-podfile-template",
  ]

  // Search for the files
  let foundAndPatched = false

  for (const expoPath of expoPaths) {
    if (!fs.existsSync(expoPath)) continue

    console.log(`📂 Checking in ${expoPath}`)

    for (const file of potentialFiles) {
      const filePath = path.join(expoPath, file)

      if (fs.existsSync(filePath)) {
        console.log(`📄 Found ${filePath}`)

        // Read the file
        const content = fs.readFileSync(filePath, "utf8")

        // Check if the file contains the problematic code
        if (content.includes("config_command") && content.includes("use_native_modules!")) {
          console.log(`🔧 Found problematic code in ${filePath}`)

          // Create a backup
          fs.writeFileSync(`${filePath}.backup`, content)

          // Replace the problematic code
          const patchedContent = content.replace(
            /config\s*=\s*use_native_modules!$$config_command$$/g,
            "config = use_native_modules!",
          )

          // Write the patched content back
          fs.writeFileSync(filePath, patchedContent)

          console.log(`✅ Successfully patched ${filePath}`)
          foundAndPatched = true
        }
      }
    }
  }

  // If we couldn't find the file, try a more aggressive approach
  if (!foundAndPatched) {
    console.log("⚠️ Could not find the file that generates the Podfile. Trying a more aggressive approach...")

    // Create a script that will patch the Podfile during the build process
    const patchScript = `
#!/bin/bash

# Wait for the Podfile to be generated
while [ ! -f "ios/Podfile" ]; do
  echo "⏳ Waiting for Podfile to be generated..."
  sleep 1
done

echo "🔍 Found Podfile, patching..."

# Make a backup of the original Podfile
cp ios/Podfile ios/Podfile.backup

# Fix the problematic line in the Podfile
sed -i.bak 's/config = use_native_modules!(config_command)/config = use_native_modules!/g' ios/Podfile

# Check if the replacement was successful
if grep -q "config = use_native_modules!" ios/Podfile; then
  echo "✅ Successfully patched Podfile"
else
  echo "❌ Failed to patch Podfile"
  # Restore the backup if the patch failed
  cp ios/Podfile.backup ios/Podfile
fi
`

    // Write the patch script
    fs.writeFileSync("patch-podfile.sh", patchScript)
    fs.chmodSync("patch-podfile.sh", "755") // Make it executable

    console.log("📝 Created patch-podfile.sh script")

    // Modify package.json to run the patch script before the build
    try {
      const packageJsonPath = path.join(process.cwd(), "package.json")
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

      // Add the script to the prebuild script
      packageJson.scripts = packageJson.scripts || {}

      // Preserve existing prebuild script if it exists
      const existingPrebuild = packageJson.scripts.prebuild || ""
      packageJson.scripts.prebuild = existingPrebuild
        ? `${existingPrebuild} && ./patch-podfile.sh`
        : "./patch-podfile.sh"

      // Write the modified package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

      console.log("✅ Updated package.json to run the patch script before the build")
    } catch (error) {
      console.error("❌ Failed to update package.json:", error)
    }
  }

  console.log("🚀 Patch process completed")
}

// Run the patch function
patchPodfileGenerator()
