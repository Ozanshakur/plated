"use client"

import type React from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import Box from "./Box"
import Text from "./Text"
import { AlertTriangle } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"

interface ErrorWidgetProps {
  title: string
  message: string
  onRetry?: () => void
  buttonText?: string
}

const ErrorWidget: React.FC<ErrorWidgetProps> = ({ title, message, onRetry, buttonText = "Erneut versuchen" }) => {
  const { theme } = useTheme()

  return (
    <Box
      marginBottom="m"
      padding="m"
      style={{ backgroundColor: theme.colors.error + "10" }} // Using style prop with opacity
      borderRadius="m"
      borderWidth={1}
      borderColor="error"
    >
      <Box flexDirection="row" alignItems="center" marginBottom="s">
        <AlertTriangle size={20} color={theme.colors.error} />
        <Text variant="subtitle" color="error" marginLeft="s">
          {title}
        </Text>
      </Box>
      <Text variant="body" color="error" marginBottom={onRetry ? "s" : undefined}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.error }]} onPress={onRetry}>
          <Text variant="button" style={{ color: "white" }}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </Box>
  )
}

const styles = StyleSheet.create({
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
})

export default ErrorWidget
