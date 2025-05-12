import { supabase } from "./supabase"

// Definiere Typen für bessere Typsicherheit
interface Profile {
  username: string
  license_plate: string
}

interface PostData {
  id: string
  content: string
  image_url: string | null
  image_base64: string | null
  created_at: string
  likes_count: number | null
  comments_count: number | null
  user_id: string
  profiles: Profile | Profile[] | null
}

interface FormattedPost {
  id: string
  content: string
  image_url: string | null
  image_base64: string | null
  created_at: string
  likes_count: number
  comments_count: number
  user_id: string
  username: string
  license_plate: string
}

/**
 * Extrahiert Profilinformationen aus dem Profil-Objekt oder -Array
 */
function extractProfileInfo(profiles: Profile | Profile[] | null): { username: string; license_plate: string } {
  if (!profiles) {
    return { username: "Unbekannt", license_plate: "???" }
  }

  // Wenn es ein Array ist, nimm das erste Element
  if (Array.isArray(profiles)) {
    if (profiles.length === 0) {
      return { username: "Unbekannt", license_plate: "???" }
    }
    return {
      username: profiles[0].username || "Unbekannt",
      license_plate: profiles[0].license_plate || "???",
    }
  }

  // Wenn es ein Objekt ist
  return {
    username: profiles.username || "Unbekannt",
    license_plate: profiles.license_plate || "???",
  }
}

/**
 * Lädt Posts mit allen notwendigen Informationen
 * @param limit Maximale Anzahl der Posts
 * @param offset Offset für Pagination
 * @returns Array von Posts
 */
export const getPosts = async (limit = 10, offset = 0): Promise<FormattedPost[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        image_url,
        image_base64,
        created_at,
        likes_count,
        comments_count,
        user_id,
        profiles (
          username,
          license_plate
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    console.log(`Geladene Posts: ${data.length}`)

    // Formatiere die Daten für die Anzeige
    return (data as PostData[]).map((post) => {
      const { username, license_plate } = extractProfileInfo(post.profiles)

      // Log für Debugging
      if (post.image_base64) {
        console.log(`Post ${post.id} hat Base64-Bild (gekürzt): ${post.image_base64.substring(0, 30)}...`)
      } else if (post.image_url) {
        console.log(`Post ${post.id} hat Bild-URL: ${post.image_url}`)
      } else {
        console.log(`Post ${post.id} hat kein Bild`)
      }

      return {
        id: post.id,
        content: post.content,
        image_url: post.image_url,
        image_base64: post.image_base64,
        created_at: post.created_at,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        user_id: post.user_id,
        username,
        license_plate,
      }
    })
  } catch (error) {
    console.error("Fehler beim Laden der Posts:", error)
    return []
  }
}

/**
 * Lädt einen einzelnen Post mit allen notwendigen Informationen
 * @param postId ID des Posts
 * @returns Post-Objekt oder null
 */
export const getPost = async (postId: string): Promise<FormattedPost | null> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        image_url,
        image_base64,
        created_at,
        likes_count,
        comments_count,
        user_id,
        profiles (
          username,
          license_plate
        )
      `)
      .eq("id", postId)
      .single()

    if (error) {
      throw error
    }

    const postData = data as PostData
    const { username, license_plate } = extractProfileInfo(postData.profiles)

    return {
      id: postData.id,
      content: postData.content,
      image_url: postData.image_url,
      image_base64: postData.image_base64,
      created_at: postData.created_at,
      likes_count: postData.likes_count || 0,
      comments_count: postData.comments_count || 0,
      user_id: postData.user_id,
      username,
      license_plate,
    }
  } catch (error) {
    console.error(`Fehler beim Laden des Posts ${postId}:`, error)
    return null
  }
}
