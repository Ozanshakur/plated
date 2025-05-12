module.exports = {
  name: "Plated",
  slug: "plated",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "de.getplated.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "de.getplated.app",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "expo-image-picker",
      {
        photosPermission: "Die App benötigt Zugriff auf deine Fotos, um Bilder für deine Posts auszuwählen.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "7fefdf15-c943-4520-bbc5-edfe4e6ca20c",
    },
  },
}
