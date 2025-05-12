"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import { ThemeProvider as RestyleThemeProvider } from "@shopify/restyle"
import { lightTheme, darkTheme, type Theme } from "../../theme/theme"

type ThemeContextType = {
  theme: Theme
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme()
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === "dark")

  useEffect(() => {
    setIsDarkMode(colorScheme === "dark")
  }, [colorScheme])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const theme = isDarkMode ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      <RestyleThemeProvider theme={theme}>{children}</RestyleThemeProvider>
    </ThemeContext.Provider>
  )
}
