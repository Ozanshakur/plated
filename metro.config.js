// Einfache Metro-Konfiguration ohne Abhängigkeit von importLocationsPlugin
const path = require("path")

module.exports = {
  resolver: {
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
    sourceExts: ["js", "jsx", "ts", "tsx", "json", "mjs"],
    blockList: [
      /node_modules\/ws\/lib\/websocket\.js/,
      /node_modules\/@supabase\/realtime-js/,
      /node_modules\/@supabase\/supabase-js\/dist\/.*\/lib\/realtime-client\.js/,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}
