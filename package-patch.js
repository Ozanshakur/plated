// Create a new file to add cross-env to package.json
const fs = require("fs")
const path = require("path")

// Read the package.json file
const packageJsonPath = path.join(process.cwd(), "package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

// Add cross-env as a dev dependency if it doesn't exist
if (!packageJson.devDependencies) {
  packageJson.devDependencies = {}
}

if (!packageJson.devDependencies["cross-env"]) {
  packageJson.devDependencies["cross-env"] = "^7.0.3"
  console.log("Added cross-env as a dev dependency")
}

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
console.log("Updated package.json successfully")

// Install the new dependency
const { execSync } = require("child_process")
try {
  console.log("Installing cross-env...")
  execSync("npm install", { stdio: "inherit" })
  console.log("cross-env installed successfully")
} catch (error) {
  console.error("Failed to install cross-env:", error)
}
