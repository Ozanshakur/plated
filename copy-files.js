const fs = require('fs');
const path = require('path');

// Ignoriere alle Befehlszeilenargumente
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log('Warning: This script does not accept any arguments. Ignoring:', args.join(' '));
}

// Funktion zum rekursiven Kopieren von Verzeichnissen
function copyDir(src, dest) {
  // Erstelle das Zielverzeichnis, falls es nicht existiert
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Lese alle Dateien im Quellverzeichnis
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Rekursiv für Unterverzeichnisse aufrufen
      copyDir(srcPath, destPath);
    } else {
      // Kopiere die Datei
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Hauptfunktion
function main() {
  console.log('Starting file copy process...');
  
  // Stelle sicher, dass das Zielverzeichnis existiert
  const buildDir = path.join(process.cwd(), 'ios', 'build', 'fmt-patch');
  fs.mkdirSync(buildDir, { recursive: true });
  console.log(`Created directory: ${buildDir}`);
  
  // Kopiere die Dateien
  const sourceDir = path.join(process.cwd(), 'fmt-patch');
  if (fs.existsSync(sourceDir)) {
    copyDir(sourceDir, buildDir);
    console.log('Files copied successfully!');
  } else {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }
}

// Führe die Hauptfunktion aus
main();