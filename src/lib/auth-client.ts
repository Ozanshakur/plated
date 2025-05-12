import { createClient } from "@supabase/supabase-js"
import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Verwende die bereitgestellten Supabase-Anmeldedaten
const supabaseUrl = "https://wxufgkilyxudadmuxpyc.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dWZna2lseXh1ZGFkbXV4cHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzA5ODQsImV4cCI6MjA2MjIwNjk4NH0.kvPyTTC5r2TPF_CE0R6b_kDJuH9fDwF0O2UBfd_-ZlA"

// Konfiguriere einen separaten Supabase-Client nur für Authentifizierung
// Dies hilft, Konflikte mit dem Hauptclient zu vermeiden
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Authentifizierungsfunktionen
export const authService = {
  // Direkter Zugriff auf den Auth-Client für spezielle Operationen
  auth: authClient.auth,

  // Registrierung mit minimalen Optionen
  async signUp(email: string, password: string) {
    console.log("Starte Registrierung mit E-Mail:", email)

    try {
      // Minimale Registrierung ohne zusätzliche Optionen
      const { data, error } = await authClient.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error("Registrierungsfehler:", error)
        throw error
      }

      console.log("Registrierung erfolgreich:", data)
      return { data, error: null }
    } catch (error) {
      console.error("Unerwarteter Fehler bei der Registrierung:", error)
      return { data: null, error }
    }
  },

  // Anmeldung
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error("Anmeldefehler:", error)
      return { data: null, error }
    }
  },

  // Abmeldung
  async signOut() {
    try {
      // Versuche die Abmeldung, ignoriere Realtime-Fehler
      try {
        await authClient.auth.signOut()
      } catch (e) {
        // Wenn der Fehler mit Realtime zu tun hat, ignoriere ihn
        if (e instanceof Error && e.message.includes("realtime")) {
          console.log("Realtime-Fehler beim Abmelden ignoriert")
        } else {
          throw e // Andere Fehler weiterwerfen
        }
      }
      return { error: null }
    } catch (error) {
      console.error("Abmeldefehler:", error)
      return { error }
    }
  },

  // Aktuellen Benutzer abrufen
  async getCurrentUser() {
    try {
      const { data, error } = await authClient.auth.getUser()
      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen des Benutzers:", error)
      return { user: null, error }
    }
  },

  // Aktuelle Sitzung abrufen
  async getSession() {
    try {
      const { data, error } = await authClient.auth.getSession()
      if (error) throw error
      return { session: data.session, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen der Sitzung:", error)
      return { session: null, error }
    }
  },

  // Passwort zurücksetzen
  async resetPassword(email: string) {
    try {
      const { data, error } = await authClient.auth.resetPasswordForEmail(email, {
        redirectTo: "plated://auth/reset-password",
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error("Fehler beim Zurücksetzen des Passworts:", error)
      return { data: null, error }
    }
  },
}
