// Dieser Datei wird von Expo verwendet, wenn die Standard-Metro-Konfiguration nicht funktioniert
const { getDefaultConfig } = require("@expo/metro-config")
const config = getDefaultConfig(__dirname)

// Füge die notwendigen Konfigurationen hinzu
config.resolver.extraNodeModules = require("./metro.config").resolver.extraNodeModules
config.resolver.sourceExts = require("./metro.config").resolver.sourceExts
config.resolver.blockList = require("./metro.config").resolver.blockList

module.exports = config
