"use client"

import type React from "react"
import { View, StyleSheet } from "react-native"
import { Check, AlertTriangle, Clock } from "lucide-react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import type { VerificationStatus } from "../types/verification"

interface VerificationBadgeProps {
  status: VerificationStatus
  size?: "small" | "medium"
  showText?: boolean
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status, size = "small", showText = false }) => {
  const { theme } = useTheme()

  let color = ""
  let icon = null
  let text = ""

  switch (status) {
    case "verified":
      color = theme.colors.success
      icon = <Check size={size === "small" ? 10 : 14} color="#fff" />
      text = ""
      break
    case "pending":
      color = theme.colors.warning
      icon = <Clock size={size === "small" ? 10 : 14} color="#fff" />
      text = ""
      break
    case "rejected":
    case "not_verified":
    default:
      color = theme.colors.secondaryText
      icon = <AlertTriangle size={size === "small" ? 10 : 14} color="#fff" />
      text = ""
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color },
        size === "small" ? styles.small : styles.medium,
        showText && styles.withText,
      ]}
    >
      {icon}
      {showText && <Text style={[styles.text, size === "small" ? styles.smallText : styles.mediumText]}>{text}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
  small: {
    width: 16,
    height: 16,
    padding: 2,
  },
  medium: {
    width: 24,
    height: 24,
    padding: 4,
  },
  withText: {
    width: "auto",
    paddingHorizontal: 8,
  },
  text: {
    color: "#fff",
    marginLeft: 4,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
})

export default VerificationBadge
