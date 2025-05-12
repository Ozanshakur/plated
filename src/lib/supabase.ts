import { createClient } from "@supabase/supabase-js"
import "react-native-url-polyfill/auto"
import * as SecureStore from "expo-secure-store"
import { env } from "../utils/env"

// SecureStore Adapter für Supabase
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key)
  },
}

// Erstelle den Supabase-Client mit den Umgebungsvariablen
const supabaseUrl = env.SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL oder Anon Key fehlt in den Umgebungsvariablen!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Funktion zum Testen der Supabase-Verbindung
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("profiles").select("id").limit(1)

    if (error) {
      console.error("Fehler beim Testen der Supabase-Verbindung:", error)
      return false
    }

    console.log("Supabase-Verbindung erfolgreich getestet")
    return true
  } catch (error) {
    console.error("Fehler beim Testen der Supabase-Verbindung:", error)
    return false
  }
}
