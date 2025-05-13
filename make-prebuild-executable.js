// This script makes the prebuild.sh script executable
const fs = require("fs")
const { execSync } = require("child_process")

console.log("Making prebuild.sh executable...")

try {
  // Check if we're on Windows
  const isWindows = process.platform === "win32"

  if (isWindows) {
    console.log("Running on Windows - no need to change file permissions")
  } else {
    // On Unix-like systems, make the file executable
    execSync("chmod +x ./prebuild.sh", { stdio: "inherit" })
    console.log("Successfully made prebuild.sh executable")
  }

  // Verify the file exists
  if (fs.existsSync("./prebuild.sh")) {
    console.log("prebuild.sh exists and is ready to use")
  } else {
    console.error("Error: prebuild.sh does not exist!")
    process.exit(1)
  }
} catch (error) {
  console.error("Error making prebuild.sh executable:", error)
  process.exit(1)
}
