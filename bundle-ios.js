const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Stellen Sie sicher, dass das Verzeichnis existiert
const bundleDir = path.join(__dirname, "ios", "bundle")
if (!fs.existsSync(bundleDir)) {
  fs.mkdirSync(bundleDir, { recursive: true })
}

console.log("Erstelle iOS Bundle...")

try {
  // Metro Bundler ausführen, um das JSBundle zu erstellen
  execSync(
    "npx react-native bundle --entry-file=index.js --platform=ios --dev=false --bundle-output=ios/bundle/main.jsbundle --assets-dest=ios/bundle --config=metro.config.js",
    { stdio: "inherit" },
  )

  console.log("iOS Bundle erfolgreich erstellt!")
} catch (error) {
  console.error("Fehler beim Erstellen des iOS Bundles:", error)
  process.exit(1)
}
