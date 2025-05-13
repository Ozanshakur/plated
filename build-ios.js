const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("Starting iOS build preparation...")

// Installiere notwendige Abhängigkeiten
console.log("Installing required dependencies...")
try {
  execSync("npm install expo-build-properties --save", { stdio: "inherit" })
  console.log("Dependencies installed successfully.")
} catch (error) {
  console.error("Error installing dependencies:", error)
  process.exit(1)
}

// Starte den Build-Prozess
console.log("Starting iOS build...")
try {
  execSync("eas build --platform ios --profile production --non-interactive --no-wait", { stdio: "inherit" })
  console.log("Build started successfully!")
  console.log("You can monitor the build progress on the Expo website.")
} catch (error) {
  console.error("Error starting build:", error)
  process.exit(1)
}
