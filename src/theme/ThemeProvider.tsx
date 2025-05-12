"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { ThemeProvider as RestyleThemeProvider } from "@shopify/restyle"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { StatusBar } from "expo-status-bar"
import { lightTheme, darkTheme } from "./theme"

export type ThemeContextType = {
  theme: typeof lightTheme
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

type ThemeProviderProps = {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("@theme_preference")
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark")
        }
      } catch (error) {
        console.error("Fehler beim Laden der Theme-Einstellungen:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemePreference()
  }, [])

  const toggleTheme = async () => {
    try {
      const newThemeValue = !isDarkMode
      setIsDarkMode(newThemeValue)
      await AsyncStorage.setItem("@theme_preference", newThemeValue ? "dark" : "light")
    } catch (error) {
      console.error("Fehler beim Speichern der Theme-Einstellungen:", error)
    }
  }

  const theme = isDarkMode ? darkTheme : lightTheme

  if (isLoading) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      <RestyleThemeProvider theme={theme}>
        {/* StatusBar für alle Seiten konfigurieren */}
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        {children}
      </RestyleThemeProvider>
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
