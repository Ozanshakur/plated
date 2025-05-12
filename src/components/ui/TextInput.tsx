"use client"

import type React from "react"
import { TextInput as RNTextInput, StyleSheet, type TextInputProps as RNTextInputProps } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"

interface TextInputProps extends RNTextInputProps {}

const TextInput: React.FC<TextInputProps> = ({ style, placeholderTextColor, ...props }) => {
  const { theme } = useTheme()

  return (
    <RNTextInput
      style={[
        styles.input,
        {
          color: theme.colors.primaryText,
          backgroundColor: theme.colors.inputBackground,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor || theme.colors.secondaryText}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
  },
})

export default TextInput
