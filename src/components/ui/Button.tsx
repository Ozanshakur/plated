"use client"

import type React from "react"
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle, Animated, Pressable } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useTheme } from "../../theme/ThemeProvider"
import Box from "./Box"
import Text from "./Text"
import { useRef } from "react"

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "outline" | "gradient"
  size?: "small" | "medium" | "large"
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const { theme } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Animation für den Druck-Effekt
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start()
  }

  // Bestimme Stile basierend auf Variante
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.gray400

    switch (variant) {
      case "primary":
        return theme.colors.buttonPrimary
      case "secondary":
        return theme.colors.buttonSecondary
      case "outline":
      case "gradient":
        return "transparent"
      default:
        return theme.colors.buttonPrimary
    }
  }

  const getTextColor = () => {
    if (disabled) return theme.colors.gray500

    switch (variant) {
      case "primary":
      case "gradient":
        return theme.colors.buttonText
      case "secondary":
        return theme.colors.buttonTextSecondary
      case "outline":
        return theme.colors.primary
      default:
        return theme.colors.buttonText
    }
  }

  // Bestimme Größe
  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: 8, paddingHorizontal: 12 }
      case "medium":
        return { paddingVertical: 12, paddingHorizontal: 16 }
      case "large":
        return { paddingVertical: 16, paddingHorizontal: 24 }
      default:
        return { paddingVertical: 12, paddingHorizontal: 16 }
    }
  }

  const getBorderStyle = () => {
    return variant === "outline" ? { borderWidth: 1, borderColor: theme.colors.primary } : {}
  }

  // Wenn es ein Gradient-Button ist, verwende LinearGradient
  if (variant === "gradient" && !disabled) {
    return (
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.buttonContainer,
          {
            width: fullWidth ? "100%" : "auto",
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
        disabled={disabled || loading}
      >
        <Animated.View
          style={[
            styles.buttonInner,
            {
              transform: [{ scale: scaleAnim }],
              width: fullWidth ? "100%" : "auto",
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.gradient,
              {
                borderRadius: 12,
                ...getPadding(),
              },
            ]}
          >
            <Box flexDirection="row" alignItems="center" justifyContent="center">
              {loading ? (
                <ActivityIndicator size="small" color={getTextColor()} style={styles.icon} />
              ) : icon ? (
                <Box marginRight="xs">{icon}</Box>
              ) : null}

              <Text variant="button" style={{ color: getTextColor() }}>
                {title}
              </Text>
            </Box>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    )
  }

  // Standard-Button
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.buttonContainer,
        {
          width: fullWidth ? "100%" : "auto",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            width: fullWidth ? "100%" : "auto",
            ...getPadding(),
            ...getBorderStyle(),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Box flexDirection="row" alignItems="center" justifyContent="center">
          {loading ? (
            <ActivityIndicator size="small" color={getTextColor()} style={styles.icon} />
          ) : icon ? (
            <Box marginRight="xs">{icon}</Box>
          ) : null}

          <Text variant="button" style={{ color: getTextColor() }}>
            {title}
          </Text>
        </Box>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 8,
  },
})

export default Button
