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
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "Diese App benötigt Zugriff auf die Kamera, um Fotos aufzunehmen.",
      NSPhotoLibraryUsageDescription: "This app uses your photo library to upload images for your profile and posts.",
      NSPhotoLibraryAddUsageDescription: "This app saves images to your photo library when you download them.",
      NSLocationWhenInUseUsageDescription: "This app uses your location to show nearby users and posts.",
      NSLocationAlwaysUsageDescription: "This app uses your location to show nearby users and posts.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to show nearby users and posts.",
      NSMicrophoneUsageDescription: "This app uses the microphone to record audio for your posts.",
      UIBackgroundModes: ["fetch", "remote-notification"],
    },
    config: {
      usesNonExemptEncryption: false,
    },
    // Add this to ensure the fmt library is properly patched
    podfileProperties: {
      "ios.useFrameworks": "static",
      fmt_version: "6.2.1",
      fmt_disable_nontype_template_parameters: "true",
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
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          deploymentTarget: "13.0",
          // Add C++ flags to fix the fmt library
          extraPods: [
            {
              name: "fmt",
              version: "6.2.1",
              configurations: ["Debug", "Release"],
              modular_headers: true,
              script_phases: [
                {
                  name: "Patch fmt library",
                  script: "bash ${PODS_ROOT}/../patch-fmt.sh || true",
                  execution_position: "after_compile",
                },
              ],
            },
          ],
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "7fefdf15-c943-4520-bbc5-edfe4e6ca20c",
    },
  },
}
