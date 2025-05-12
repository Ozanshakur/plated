import { supabase } from "./supabase"

/**
 * Prüft, ob ein Bucket existiert
 * @param bucketName Der Name des Buckets
 * @returns true, wenn der Bucket existiert, false sonst
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("Fehler beim Abrufen der Buckets:", error)
      return false
    }

    return buckets?.some((bucket) => bucket.name === bucketName) || false
  } catch (error) {
    console.error("Fehler beim Prüfen des Buckets:", error)
    return false
  }
}

/**
 * Lädt ein Bild in einen Bucket hoch
 * @param bucketName Der Name des Buckets
 * @param uri URI des Bildes
 * @param userId ID des Benutzers für den Pfad
 * @returns URL des hochgeladenen Bildes oder null bei Fehler
 */
export const uploadImageToBucket = async (bucketName: string, uri: string, userId: string): Promise<string | null> => {
  try {
    // Konvertiere das Bild in ein Blob
    const response = await fetch(uri)
    const blob = await response.blob()

    // Generiere einen eindeutigen Dateinamen
    const fileExt = uri.split(".").pop() || "jpg"
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    console.log(`Versuche, Bild hochzuladen: ${filePath} in Bucket ${bucketName}`)

    // Lade das Bild hoch
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob)

    if (error) {
      console.error("Fehler beim Hochladen des Bildes:", error)
      return null
    }

    console.log("Bild erfolgreich hochgeladen:", data.path)

    // Generiere die öffentliche URL
    const { data: publicURL } = supabase.storage.from(bucketName).getPublicUrl(data.path)

    console.log("Generierte öffentliche URL:", publicURL.publicUrl)

    return publicURL.publicUrl
  } catch (error) {
    console.error("Fehler beim Hochladen des Bildes:", error)
    return null
  }
}

/**
 * Testet, ob ein Bild über die URL zugänglich ist
 * @param url Die zu testende URL
 * @returns true, wenn das Bild zugänglich ist, false sonst
 */
export const testImageAccess = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch (error) {
    console.error("Fehler beim Testen des Bildzugriffs:", error)
    return false
  }
}

// Add a function to upload profile images
export const uploadProfileImage = async (userId: string, localImageUri: string): Promise<string | null> => {
  try {
    // Convert image to base64
    const response = await fetch(localImageUri)
    const blob = await response.blob()

    // Create a file reader to convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64data = reader.result as string
          const base64Content = base64data.split(",")[1] // Remove the data:image/jpeg;base64, part

          // Upload to Supabase Storage
          const fileName = `profile_${userId}_${Date.now()}.jpg`
          const { data, error } = await supabase.storage.from("avatars").upload(fileName, decode(base64Content), {
            contentType: "image/jpeg",
            upsert: true,
          })

          if (error) throw error

          // Get public URL
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

          resolve(urlData.publicUrl)
        } catch (error) {
          console.error("Error in uploadProfileImage:", error)
          reject(error)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error uploading profile image:", error)
    return null
  }
}

// Helper function to decode base64
function decode(base64: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i,
    p = 0,
    encoded1,
    encoded2,
    encoded3,
    encoded4

  if (base64[base64.length - 1] === "=") {
    bufferLength--
    if (base64[base64.length - 2] === "=") {
      bufferLength--
    }
  }

  const arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer)

  for (i = 0; i < len; i += 4) {
    encoded1 = chars.indexOf(base64[i])
    encoded2 = chars.indexOf(base64[i + 1])
    encoded3 = chars.indexOf(base64[i + 2])
    encoded4 = chars.indexOf(base64[i + 3])

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
  }

  return arraybuffer
}
