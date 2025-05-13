const fs = require("fs")
const path = require("path")

// Pfad zur Expo.podspec-Datei
const podspecPath = path.join(__dirname, "node_modules", "expo", "Expo.podspec")

// Prüfen, ob die Datei existiert
if (fs.existsSync(podspecPath)) {
  console.log("Patching Expo.podspec...")

  // Dateiinhalt lesen
  let podspecContent = fs.readFileSync(podspecPath, "utf8")

  // Prüfen, ob die problematische Zeile vorhanden ist
  if (podspecContent.includes("compiler_flags = get_folly_config()[:compiler_flags]")) {
    // Ersetzen der problematischen Zeile
    podspecContent = podspecContent.replace(
      "compiler_flags = get_folly_config()[:compiler_flags]",
      "compiler_flags = []",
    )

    // Geänderten Inhalt zurückschreiben
    fs.writeFileSync(podspecPath, podspecContent)
    console.log("Expo.podspec successfully patched!")
  } else {
    console.log("The problematic line was not found in Expo.podspec. No changes made.")
  }
} else {
  console.log("Expo.podspec not found at path:", podspecPath)
}
