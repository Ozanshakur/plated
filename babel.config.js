module.exports = (api) => {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            ws: "./src/lib/ws-mock.js",
            net: "./src/lib/empty-mock.js",
            tls: "./src/lib/empty-mock.js",
            fs: "./src/lib/empty-mock.js",
            child_process: "./src/lib/empty-mock.js",
            bufferutil: "./src/lib/empty-mock.js",
            "utf-8-validate": "./src/lib/empty-mock.js",
            "@supabase/realtime-js": "./src/lib/supabase-realtime-mock.js",
          },
        },
      ],
      "@babel/plugin-transform-private-methods",
      "@babel/plugin-transform-private-property-in-object",
      "@babel/plugin-transform-class-properties",
    ],
  }
}
