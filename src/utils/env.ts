// Sichere Methode zum Zugriff auf Umgebungsvariablen
import Constants from "expo-constants"

// Typdefinition für Umgebungsvariablen
interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  EXPO_PROJECT_ID: string
  APP_ENV: "development" | "production" | "test"
}

// Extrahiere Umgebungsvariablen aus Expo Constants
const getEnv = (): Env => {
  const env = Constants.expoConfig?.extra || {}

  // Fallback-Werte für Entwicklung
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "",
    EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || env.EXPO_PROJECT_ID || "",
    APP_ENV: (process.env.APP_ENV || env.APP_ENV || "development") as Env["APP_ENV"],
  }
}

// Exportiere die Umgebungsvariablen
export const env = getEnv()

// Hilfsfunktion zur Überprüfung, ob wir in der Produktion sind
export const isProduction = (): boolean => env.APP_ENV === "production"

// Hilfsfunktion zur Überprüfung, ob wir in der Entwicklung sind
export const isDevelopment = (): boolean => env.APP_ENV === "development"

// Hilfsfunktion zur Überprüfung, ob wir im Test sind
export const isTest = (): boolean => env.APP_ENV === "test"
