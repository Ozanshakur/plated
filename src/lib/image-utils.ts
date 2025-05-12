import * as FileSystem from "expo-file-system"
import * as ImageManipulator from "expo-image-manipulator"

/**
 * Bereitet eine Bild-URL für die Anzeige vor
 * @param url Die ursprüngliche URL
 * @returns Die vorbereitete URL
 */
export const prepareImageForDisplay = (url: string): string => {
  // Füge einen Zeitstempel hinzu, um Caching-Probleme zu vermeiden
  const timestamp = Date.now()
  return `${url}?t=${timestamp}`
}

/**
 * Konvertiert ein Bild in einen Base64-String
 * @param uri URI des Bildes
 * @returns Base64-String oder null bei Fehler
 */
export const imageToBase64 = async (uri: string): Promise<string | null> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Bestimme den MIME-Typ basierend auf der Dateiendung
    const fileExtension = uri.split(".").pop()?.toLowerCase() || "jpg"
    let mimeType = "image/jpeg" // Standard-MIME-Typ

    // Setze den MIME-Typ basierend auf der Dateiendung
    switch (fileExtension) {
      case "png":
        mimeType = "image/png"
        break
      case "gif":
        mimeType = "image/gif"
        break
      case "webp":
        mimeType = "image/webp"
        break
      case "svg":
        mimeType = "image/svg+xml"
        break
      case "jpg":
      case "jpeg":
      default:
        mimeType = "image/jpeg"
        break
    }

    const result = `data:${mimeType};base64,${base64}`
    console.log(`Base64-String erstellt (gekürzt): ${result.substring(0, 50)}...`)
    return result
  } catch (error) {
    console.error("Fehler bei der Konvertierung zu Base64:", error)
    return null
  }
}

/**
 * Komprimiert ein Bild und konvertiert es in Base64
 * @param uri URI des Bildes
 * @param quality Qualität der Komprimierung (0-1)
 * @returns Base64-String oder null bei Fehler
 */
export const compressAndConvertToBase64 = async (uri: string, quality = 0.7): Promise<string | null> => {
  try {
    // Stelle sicher, dass quality zwischen 0 und 1 liegt
    const safeQuality = Math.max(0, Math.min(1, quality))

    console.log(`Komprimiere Bild mit Qualität: ${safeQuality}`)

    // Komprimiere das Bild
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1000 } }], // Maximale Breite von 1000px
      {
        compress: safeQuality,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    )

    console.log("Bild erfolgreich komprimiert")

    // Konvertiere zu Base64
    return await imageToBase64(manipResult.uri)
  } catch (error) {
    console.error("Fehler bei der Bildkomprimierung:", error)

    // Fallback: Versuche, das Originalbild ohne Komprimierung zu konvertieren
    console.log("Versuche Fallback ohne Komprimierung...")
    try {
      return await imageToBase64(uri)
    } catch (fallbackError) {
      console.error("Auch Fallback fehlgeschlagen:", fallbackError)
      return null
    }
  }
}

/**
 * Prüft, ob ein Base64-String zu groß ist
 * @param base64 Base64-String
 * @param maxSizeInMB Maximale Größe in MB
 * @returns true, wenn der String zu groß ist
 */
export const isBase64TooLarge = (base64: string, maxSizeInMB = 1): boolean => {
  if (!base64) return false

  // Berechne die Größe in Bytes (1 Zeichen = 1 Byte)
  const sizeInBytes = base64.length
  const sizeInMB = sizeInBytes / (1024 * 1024)
  console.log(`Base64-Größe: ${sizeInMB.toFixed(2)} MB`)
  return sizeInMB > maxSizeInMB
}

/**
 * Testet, ob ein Bild zugänglich ist
 * @param url URL des Bildes
 * @returns true, wenn das Bild zugänglich ist
 */
export const testImageAccess = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch (error) {
    console.error(`Fehler beim Testen des Bildzugriffs: ${url}`, error)
    return false
  }
}

/**
 * Prüft, ob ein String ein Base64-kodiertes Bild ist
 * @param str Der zu prüfende String
 * @returns true, wenn der String ein Base64-kodiertes Bild ist, false sonst
 */
export const isBase64Image = (str: string): boolean => {
  if (!str) return false
  return str.startsWith("data:image/") && str.includes(";base64,")
}

/**
 * Bereinigt eine Supabase-URL für die Verwendung in React Native
 * @param url Die zu bereinigende URL
 * @returns Die bereinigte URL
 */
export const cleanSupabaseUrl = (url: string | null): string | null => {
  if (!url) return null

  // Entferne Fragezeichen und Parameter, die Probleme verursachen könnten
  const baseUrl = url.split("?")[0]

  // Füge einen Zeitstempel hinzu, um Caching-Probleme zu vermeiden
  return `${baseUrl}?t=${Date.now()}`
}
