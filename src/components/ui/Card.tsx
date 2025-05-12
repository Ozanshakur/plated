"use client"

import type React from "react"
import { StyleSheet, Animated, Pressable } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { useRef } from "react"

interface CardProps {
  children: React.ReactNode
  onPress?: () => void
  style?: any
  variant?: "default" | "elevated" | "outlined" | "subtle" | "filled"
  padding?: "none" | "small" | "medium" | "large"
}

const Card: React.FC<CardProps> = ({ children, onPress, style, variant = "default", padding = "medium" }) => {
  const { theme } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Animation für den Druck-Effekt, wenn onPress vorhanden ist
  const handlePressIn = () => {
    if (!onPress) return
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    if (!onPress) return
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start()
  }

  // Bestimme Stile basierend auf Variante
  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadii.m,
    }

    switch (variant) {
      case "elevated":
        return {
          ...baseStyle,
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }
      case "outlined":
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        }
      case "subtle":
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primaryLight,
        }
      case "filled":
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        }
      default:
        return baseStyle
    }
  }

  // Bestimme Padding basierend auf Größe
  const getPaddingStyle = () => {
    switch (padding) {
      case "none":
        return { padding: 0 }
      case "small":
        return { padding: 8 }
      case "medium":
        return { padding: 16 }
      case "large":
        return { padding: 24 }
      default:
        return { padding: 16 }
    }
  }

  const cardContent = (
    <Animated.View
      style={[styles.card, getCardStyle(), getPaddingStyle(), { transform: [{ scale: scaleAnim }] }, style]}
    >
      {children}
    </Animated.View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.pressable}>
        {cardContent}
      </Pressable>
    )
  }

  return cardContent
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  card: {
    width: "100%",
  },
})

export default Card
