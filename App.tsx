"use client"

import { useEffect, useState } from "react"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ThemeProvider } from "./src/theme/ThemeProvider"
import Navigation from "./src/navigation"
import { AuthProvider } from "./src/context/AuthContext"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as SplashScreen from "expo-splash-screen"
import { View, Text, LogBox } from "react-native"
import { initializeApp } from "./src/utils/app-init"

// Ignoriere ALLE Warnungen im Entwicklungsmodus
// HINWEIS: Dies sollte nur während der Entwicklung verwendet werden
// und vor der Produktion entfernt werden
LogBox.ignoreAllLogs()

// Halte den Splash-Screen sichtbar, bis die App bereit ist
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignoriere Fehler */
})

// Erstelle einen QueryClient für React Query
const queryClient = new QueryClient()

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    // Initialisierungscode ausführen
    async function prepare() {
      try {

        // Initialisiere die App
        await initializeApp()

        // Hier könnten wir Fonts laden, Daten vorabladen, etc.
        // Simuliere eine kurze Ladezeit
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (e) {
        console.warn(e)
        setConnectionError(true)
      } finally {
        // Markiere die App als bereit
        setIsReady(true)
        // Verstecke den Splash-Screen
        await SplashScreen.hideAsync()
      }
    }

    prepare()
  }, [])

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Plated wird geladen...</Text>
      </View>
    )
  }

  if (connectionError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Verbindungsfehler</Text>
        <Text style={{ textAlign: "center" }}>
          Es konnte keine Verbindung zur Datenbank hergestellt werden. Bitte überprüfe deine Internetverbindung und
          versuche es erneut.
        </Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <ThemeProvider>
              <Navigation />
              <StatusBar />
            </ThemeProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
