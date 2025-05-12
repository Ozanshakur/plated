// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const config = getDefaultConfig(__dirname)

// Füge Node.js-Polyfills hinzu
config.resolver.extraNodeModules = {
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
}

// Füge Unterstützung für mjs-Dateien hinzu
config.resolver.sourceExts.push("mjs")

// Blockiere bestimmte Module komplett
config.resolver.blockList = [
  /node_modules\/ws\/lib\/websocket\.js/,
  /node_modules\/@supabase\/realtime-js/,
  /node_modules\/@supabase\/supabase-js\/dist\/.*\/lib\/realtime-client\.js/,
]

module.exports = config
