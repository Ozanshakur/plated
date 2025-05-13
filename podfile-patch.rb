#!/usr/bin/env ruby

# Pfad zur Podfile
podfile_path = 'ios/Podfile'

# Überprüfen, ob die Datei existiert
if File.exist?(podfile_path)
  puts "Patching Podfile..."
  
  # Dateiinhalt lesen
  podfile_content = File.read(podfile_path)
  
  # Hermes deaktivieren
  podfile_content = podfile_content.gsub(
    /use_react_native!.*hermes_enabled.*true/m,
    'use_react_native!(hermes_enabled: false)'
  )
  
  # fmt-Version festlegen
  podfile_content = podfile_content + "\n\n# Fix fmt library issues\npod 'fmt', '~> 6.2.1', :modular_headers => true\n"
  
  # Geänderten Inhalt zurückschreiben
  File.write(podfile_path, podfile_content)
  puts "Podfile successfully patched!"
else
  puts "Podfile not found at path: #{podfile_path}"
end
