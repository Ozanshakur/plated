// Dieses Skript patcht die Supabase-Bibliothek, um WebSockets zu deaktivieren
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Finde alle möglichen Pfade zur Realtime-Client-Datei
const possiblePaths = [
  // Supabase JS v2
  path.resolve(__dirname, "node_modules", "@supabase", "supabase-js", "dist", "module", "lib", "realtime-client.js"),
  // Supabase JS v2 (alternative Struktur)
  path.resolve(__dirname, "node_modules", "@supabase", "supabase-js", "dist", "main", "lib", "realtime-client.js"),
  // Realtime JS Paket
  path.resolve(__dirname, "node_modules", "@supabase", "realtime-js", "dist", "module", "index.js"),
  // Realtime JS Paket (alternative Struktur)
  path.resolve(__dirname, "node_modules", "@supabase", "realtime-js", "dist", "main", "index.js"),
]

// Suche nach der Realtime-Client-Datei
let realtimeClientPath = null
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    realtimeClientPath = path
    break
  }
}

// Wenn die Datei nicht gefunden wurde, suche nach allen realtime-js Dateien
if (!realtimeClientPath) {
  console.log("Could not find Supabase Realtime Client file in predefined paths.")
  console.log("Searching for realtime-js files...")

  try {
    // Suche nach allen Dateien, die "realtime" im Namen haben
    const findCommand =
      process.platform === "win32"
        ? `dir /s /b node_modules\\*realtime*.js`
        : `find node_modules -name "*realtime*.js" -type f`

    const result = execSync(findCommand, { encoding: "utf8" })
    const files = result.split("\n").filter(Boolean)

    console.log("Found the following realtime-related files:")
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`)
    })

    // Versuche, die erste gefundene Datei zu patchen
    if (files.length > 0) {
      realtimeClientPath = files[0]
      console.log(`\nAttempting to patch: ${realtimeClientPath}`)
    }
  } catch (error) {
    console.error("Error searching for realtime files:", error.message)
  }
}

// Wenn die Datei immer noch nicht gefunden wurde, erstelle eine leere Mock-Datei
if (!realtimeClientPath) {
  console.log("Could not find any Supabase Realtime Client files.")
  console.log("Creating a mock file instead...")

  const mockDir = path.resolve(__dirname, "src", "lib")
  const mockPath = path.resolve(mockDir, "supabase-realtime-mock.js")

  // Stelle sicher, dass das Verzeichnis existiert
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true })
  }

  // Erstelle eine leere Mock-Datei
  const mockContent = `
// Mock für Supabase Realtime Client
export class RealtimeClient {
  constructor() {
    console.warn('Realtime is disabled');
  }
  
  connect() { 
    console.warn('Realtime is disabled'); 
    return this; 
  }
  
  disconnect() { 
    console.warn('Realtime is disabled'); 
    return this; 
  }
  
  channel() {
    return {
      subscribe: () => ({ unsubscribe: () => {} }),
      on: () => this,
      send: () => {},
    };
  }
}

// Exportiere einen leeren Mock für das WebSocket-Paket
export const WebSocket = null;
  `

  fs.writeFileSync(mockPath, mockContent, "utf8")
  console.log(`Created mock file at: ${mockPath}`)

  // Erstelle eine Babel-Konfiguration, um den Import umzuleiten
  console.log("Please add the following to your babel.config.js:")
  console.log(`
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@supabase/realtime-js': './src/lib/supabase-realtime-mock.js',
        },
      }],
    ],
  };
};
  `)

  process.exit(0)
}

// Patche die gefundene Datei
try {
  console.log(`Patching file: ${realtimeClientPath}`)

  // Lese die Datei
  let content = fs.readFileSync(realtimeClientPath, "utf8")

  // Prüfe, ob die Datei bereits gepatcht wurde
  if (content.includes("// WebSocket import removed by patch")) {
    console.log("File already patched!")
    process.exit(0)
  }

  // Ersetze den WebSocket-Import durch einen leeren Mock
  const wsImportRegex = /import\s+.*\s+from\s+['"]ws['"]/g
  if (wsImportRegex.test(content)) {
    content = content.replace(wsImportRegex, "// WebSocket import removed by patch\nconst WebSocket = null;")
    console.log("Replaced WebSocket import")
  } else {
    console.log("No WebSocket import found")
  }

  // Ersetze die connect-Methode durch eine leere Implementierung
  const connectRegex = /connect\s*$$$$\s*{[\s\S]*?}/m
  if (connectRegex.test(content)) {
    content = content.replace(connectRegex, "connect() { console.warn('Realtime is disabled'); return this; }")
    console.log("Replaced connect method")
  } else {
    console.log("No connect method found")
  }

  // Ersetze die disconnect-Methode durch eine leere Implementierung
  const disconnectRegex = /disconnect\s*$$$$\s*{[\s\S]*?}/m
  if (disconnectRegex.test(content)) {
    content = content.replace(disconnectRegex, "disconnect() { console.warn('Realtime is disabled'); return this; }")
    console.log("Replaced disconnect method")
  } else {
    console.log("No disconnect method found")
  }

  // Schreibe die geänderte Datei zurück
  fs.writeFileSync(realtimeClientPath, content, "utf8")
  console.log("Supabase Realtime Client successfully patched!")
} catch (error) {
  console.error("Error patching file:", error.message)
  console.log("Creating a mock file instead...")

  const mockDir = path.resolve(__dirname, "src", "lib")
  const mockPath = path.resolve(mockDir, "supabase-realtime-mock.js")

  // Stelle sicher, dass das Verzeichnis existiert
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true })
  }

  // Erstelle eine leere Mock-Datei
  const mockContent = `
// Mock für Supabase Realtime Client
export class RealtimeClient {
  constructor() {
    console.warn('Realtime is disabled');
  }
  
  connect() { 
    console.warn('Realtime is disabled'); 
    return this; 
  }
  
  disconnect() { 
    console.warn('Realtime is disabled'); 
    return this; 
  }
  
  channel() {
    return {
      subscribe: () => ({ unsubscribe: () => {} }),
      on: () => this,
      send: () => {},
    };
  }
}

// Exportiere einen leeren Mock für das WebSocket-Paket
export const WebSocket = null;
  `

  fs.writeFileSync(mockPath, mockContent, "utf8")
  console.log(`Created mock file at: ${mockPath}`)

  // Erstelle eine Babel-Konfiguration, um den Import umzuleiten
  console.log("Please add the following to your babel.config.js:")
  console.log(`
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@supabase/realtime-js': './src/lib/supabase-realtime-mock.js',
        },
      }],
    ],
  };
};
  `)
}
