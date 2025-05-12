import { initializeNotifications } from "../lib/notification-service"

// Initialisiere alle App-Komponenten
export async function initializeApp() {
  try {
    console.log("Initialisiere App...")

    // Initialisiere Benachrichtigungen
    const notificationSubscriptions = await initializeNotifications()

    console.log("App erfolgreich initialisiert")

    // Rückgabe der Subscription-Objekte für späteres Aufräumen
    return {
      notificationSubscriptions,
    }
  } catch (error) {
    console.error("Fehler bei der App-Initialisierung:", error)
    return {}
  }
}

// Aufräumen beim App-Beenden
export function cleanupApp(subscriptions: any) {
  try {
    console.log("Räume App-Ressourcen auf...")

    // Benachrichtigungs-Listener entfernen
    if (subscriptions?.notificationSubscriptions) {
      const { subscription, responseSubscription } = subscriptions.notificationSubscriptions
      subscription?.remove()
      responseSubscription?.remove()
    }

    console.log("App-Ressourcen erfolgreich aufgeräumt")
  } catch (error) {
    console.error("Fehler beim Aufräumen der App-Ressourcen:", error)
  }
}
