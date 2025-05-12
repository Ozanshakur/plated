"use client"

import type React from "react"
import { useState } from "react"
import { TextInput, StyleSheet, type TextInputProps, View } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import Box from "./Box"
import Text from "./Text"

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  ...rest
}) => {
  const { theme, isDarkMode } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(false)

  const getBorderColor = () => {
    if (error) return theme.colors.error
    if (isFocused) return theme.colors.primary
    return theme.colors.border
  }

  return (
    <Box marginBottom="m">
      {label && (
        <Text variant="caption" marginBottom="xs">
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: getBorderColor(),
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {leftIcon && <Box marginRight="s">{leftIcon}</Box>}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.primaryText,
              flex: 1,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.secondaryText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {rightIcon && <Box marginLeft="s">{rightIcon}</Box>}
      </View>

      {(error || helper) && (
        <Text variant="small" color={error ? "error" : "secondaryText"} marginTop="xs">
          {error || helper}
        </Text>
      )}
    </Box>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    height: 24,
  },
})

export default Input
