"use client"

import type React from "react"
import { StyleSheet, View, TouchableOpacity } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import Text from "./Text"
import { X } from "lucide-react-native"

interface AlertProps {
  children: React.ReactNode
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  title?: string
  onClose?: () => void
}

export const Alert: React.FC<AlertProps> = ({ children, variant = "default", title, onClose }) => {
  const { theme } = useTheme()

  // Bestimme die Farben basierend auf der Variante
  const getBackgroundColor = () => {
    switch (variant) {
      case "destructive":
        return theme.colors.error
      case "success":
        return theme.colors.success
      case "warning":
        return theme.colors.warning
      case "info":
        return theme.colors.primary
      default:
        return theme.colors.cardBackground
    }
  }

  const getTextColor = () => {
    switch (variant) {
      case "destructive":
      case "success":
      case "warning":
      case "info":
        return "#fff"
      default:
        return theme.colors.primaryText
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        {title && <Text style={[styles.title, { color: getTextColor() }]}>{title}</Text>}
        {typeof children === "string" ? (
          <Text style={[styles.text, { color: getTextColor() }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={16} color={getTextColor()} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 16,
  },
  text: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
})

export default Alert
