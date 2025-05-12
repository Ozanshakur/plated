"use client"

import type React from "react"
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { useTheme } from "../theme/ThemeProvider"

interface ScreenContentWrapperProps {
  children: React.ReactNode
  scrollable?: boolean
  keyboardAvoiding?: boolean
  style?: any
  contentContainerStyle?: any
  tabletScrollContent?: boolean // Für Tablet-Layout
}

export const ScreenContentWrapper: React.FC<ScreenContentWrapperProps> = ({
  children,
  scrollable = true,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
  tabletScrollContent = false,
}) => {
  const { theme } = useTheme()

  // Basis-Container-Stil
  const containerStyle = {
    flex: 1,
    backgroundColor: theme.colors.mainBackground,
    ...style,
  }

  // Basis-Content-Container-Stil
  const baseContentContainerStyle = {
    padding: 16,
    ...contentContainerStyle,
  }

  // Wenn Keyboard-Avoiding aktiviert ist
  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={containerStyle}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {scrollable ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={baseContentContainerStyle}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, baseContentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    )
  }

  // Standard-Rendering ohne Keyboard-Avoiding
  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={baseContentContainerStyle}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    )
  }

  return <View style={[containerStyle, baseContentContainerStyle]}>{children}</View>
}

export default ScreenContentWrapper
