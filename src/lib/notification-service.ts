// Importiere die benötigten Module
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { supabase } from "./supabase"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"

// Schlüssel für AsyncStorage
const PUSH_TOKEN_KEY = "@plated_app:push_token"
const NOTIFICATIONS_ENABLED_KEY = "@plated_app:notifications_enabled"

// Konfiguriere die Benachrichtigungen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Registriere das Gerät für Push-Benachrichtigungen
export async function registerForPushNotificationsAsync() {
  let token

  // Prüfe, ob Benachrichtigungen aktiviert sind
  const notificationsEnabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
  if (notificationsEnabled === "false") return null

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      })
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== "granted") {
        console.log("Keine Berechtigung für Push-Benachrichtigungen!")
        return null
      }

      // Hole den Expo-Push-Token
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID || "your-project-id",
        })
      ).data

      console.log("Push-Token erhalten:", token)

      // Speichere den Token im AsyncStorage
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)

      // Speichere den Token in der Datenbank, wenn der Benutzer angemeldet ist
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await savePushToken(user.id, token)
      }
    } else {
      console.log("Push-Benachrichtigungen funktionieren nur auf physischen Geräten")
    }
  } catch (error) {
    console.error("Fehler bei der Registrierung für Push-Benachrichtigungen:", error)
  }

  return token
}

// Speichere den Push-Token in der Datenbank
export async function savePushToken(userId: string, token: string) {
  try {
    // Prüfe, ob der Benutzer bereits einen Token hat
    const { data, error } = await supabase
      .from("push_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = Kein Datensatz gefunden
      console.error("Fehler beim Prüfen des Push-Tokens:", error)
    }

    // Wenn kein Token gefunden wurde, füge einen neuen hinzu
    if (!data) {
      console.log("Speichere neuen Push-Token für Benutzer:", userId)
      const { error: insertError } = await supabase.from("push_tokens").insert({
        user_id: userId,
        token,
        device_type: Platform.OS,
      })

      if (insertError) {
        console.error("Fehler beim Speichern des Push-Tokens:", insertError)
      } else {
        console.log("Push-Token erfolgreich gespeichert")
      }
    } else {
      console.log("Push-Token existiert bereits")
    }
  } catch (error) {
    console.error("Fehler beim Speichern des Push-Tokens:", error)
  }
}

// Aktiviere oder deaktiviere Benachrichtigungen
export async function toggleNotifications(enabled: boolean) {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false")

  if (enabled) {
    // Wenn aktiviert, registriere das Gerät erneut
    await registerForPushNotificationsAsync()
  } else {
    // Wenn deaktiviert, entferne den Token aus der Datenbank
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY)

    if (user && token) {
      await supabase.from("push_tokens").delete().eq("user_id", user.id).eq("token", token)
    }
  }
}

// Prüfe, ob Benachrichtigungen aktiviert sind
export async function areNotificationsEnabled() {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
  return value !== "false" // Standardmäßig aktiviert, wenn nicht explizit deaktiviert
}

// Sende eine lokale Benachrichtigung
export async function sendLocalNotification(title: string, body: string, data = {}) {
  const notificationsEnabled = await areNotificationsEnabled()
  if (!notificationsEnabled) return

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Sofort anzeigen
    })
    console.log("Lokale Benachrichtigung gesendet:", { title, body })
  } catch (error) {
    console.error("Fehler beim Senden der lokalen Benachrichtigung:", error)
  }
}

// Erstelle eine neue Benachrichtigung in der Datenbank
export async function createNotification(
  userId: string,
  type: string,
  content: string,
  relatedId?: string,
  metadata: any = {},
) {
  try {
    console.log("Erstelle Benachrichtigung:", { userId, type, content })

    // Füge die Benachrichtigung in die Datenbank ein
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      content,
      related_id: relatedId,
      metadata,
    })

    if (error) {
      console.error("Fehler beim Erstellen der Benachrichtigung in der Datenbank:", error)
      throw error
    }

    // Hole alle Push-Tokens des Benutzers
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId)

    if (tokensError) {
      console.error("Fehler beim Abrufen der Push-Tokens:", tokensError)
      throw tokensError
    }

    console.log(`${tokens?.length || 0} Push-Tokens für Benutzer gefunden`)

    // Sende eine lokale Benachrichtigung, wenn der Benutzer die aktuelle App verwendet
    await sendLocalNotification(getNotificationTitle(type), content, { type, relatedId, metadata })

    // In einer echten App würdest du hier einen Push-Notification-Service verwenden
    // um Benachrichtigungen an alle Tokens zu senden
    if (tokens && tokens.length > 0) {
      // Hier würde der Code für den Versand von Push-Benachrichtigungen stehen
      // z.B. mit Expo Push Notification Service oder Firebase Cloud Messaging
      console.log(
        "Push-Benachrichtigungen würden an folgende Tokens gesendet:",
        tokens.map((t) => t.token),
      )
    }

    return true
  } catch (error) {
    console.error("Fehler beim Erstellen der Benachrichtigung:", error)
    return false
  }
}

// Hilfsfunktion, um den Titel basierend auf dem Benachrichtigungstyp zu bestimmen
function getNotificationTitle(type: string): string {
  switch (type) {
    case "verification_approved":
      return "Verifizierung erfolgreich!"
    case "verification_rejected":
      return "Verifizierung abgelehnt"
    case "verification_submitted":
      return "Verifizierung eingereicht"
    case "verification_expiry_warning":
      return "Verifizierung läuft ab"
    case "new_message":
      return "Neue Nachricht"
    case "new_comment":
      return "Neuer Kommentar"
    default:
      return "Plated App"
  }
}

// Markiere eine Benachrichtigung als gelesen
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Markieren der Benachrichtigung als gelesen:", error)
  }
}

// Markiere alle Benachrichtigungen eines Benutzers als gelesen
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Markieren aller Benachrichtigungen als gelesen:", error)
  }
}

// Hole alle ungelesenen Benachrichtigungen eines Benutzers
export async function getUnreadNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { notifications: data, error: null }
  } catch (error) {
    console.error("Fehler beim Abrufen der ungelesenen Benachrichtigungen:", error)
    return { notifications: [], error }
  }
}

// Hole alle Benachrichtigungen eines Benutzers
export async function getAllNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { notifications: data, error: null }
  } catch (error) {
    console.error("Fehler beim Abrufen aller Benachrichtigungen:", error)
    return { notifications: [], error }
  }
}

// Lösche eine Benachrichtigung
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error("Fehler beim Löschen der Benachrichtigung:", error)
    return { success: false, error }
  }
}

// Lösche alle Benachrichtigungen eines Benutzers
export async function deleteAllNotifications(userId: string) {
  try {
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error("Fehler beim Löschen aller Benachrichtigungen:", error)
    return { success: false, error }
  }
}

// Initialisiere die Benachrichtigungen
export async function initializeNotifications() {
  // Registriere für Push-Benachrichtigungen
  await registerForPushNotificationsAsync()

  // Setze einen Listener für eingehende Benachrichtigungen
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log("Benachrichtigung empfangen:", notification)
  })

  // Setze einen Listener für Benachrichtigungen, auf die geklickt wurde
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("Auf Benachrichtigung geklickt:", response)

    // Hier könnte Navigation zur entsprechenden Seite erfolgen
    // basierend auf den Daten in response.notification.request.content.data
  })

  // Rückgabe der Subscription-Objekte, damit sie später aufgeräumt werden können
  return { subscription, responseSubscription }
}
