// Minimale Metro-Konfiguration ohne Abhängigkeit von Expo's getDefaultConfig
const path = require("path")

module.exports = {
  transformer: {
    assetPlugins: ["expo-asset/tools/hashAssetFiles"],
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: [
      "bmp",
      "gif",
      "jpg",
      "jpeg",
      "png",
      "psd",
      "svg",
      "webp",
      "ttf",
      "otf",
      "woff",
      "woff2",
      "mp4",
      "mov",
      "mp3",
      "wav",
      "glb",
      "gltf",
    ],
    sourceExts: ["js", "jsx", "ts", "tsx", "json", "mjs"],
    extraNodeModules: {
      events: require.resolve("events/"),
      stream: require.resolve("stream-browserify"),
      zlib: require.resolve("browserify-zlib"),
      url: require.resolve("url/"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      crypto: require.resolve("react-native-crypto"),
      buffer: require.resolve("@craftzdog/react-native-buffer"),
      "process/browser": require.resolve("process/browser"),
      net: path.resolve(__dirname, "src/lib/empty-mock.js"),
      tls: path.resolve(__dirname, "src/lib/empty-mock.js"),
      fs: path.resolve(__dirname, "src/lib/empty-mock.js"),
      path: require.resolve("path-browserify"),
      ws: path.resolve(__dirname, "src/lib/ws-mock.js"),
      child_process: path.resolve(__dirname, "src/lib/empty-mock.js"),
      bufferutil: path.resolve(__dirname, "src/lib/empty-mock.js"),
      "utf-8-validate": path.resolve(__dirname, "src/lib/empty-mock.js"),
      "@supabase/realtime-js": path.resolve(__dirname, "src/lib/supabase-realtime-mock.js"),
    },
    blockList: [
      /node_modules\/ws\/lib\/websocket\.js/,
      /node_modules\/@supabase\/realtime-js/,
      /node_modules\/@supabase\/supabase-js\/dist\/.*\/lib\/realtime-client\.js/,
    ],
  },
  watchFolders: [path.resolve(__dirname, "./")],
  server: {
    port: process.env.RCT_METRO_PORT || 8081,
  },
}
