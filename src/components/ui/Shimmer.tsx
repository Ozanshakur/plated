"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { View, Animated, StyleSheet } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useTheme } from "../../theme/ThemeProvider"

interface ShimmerProps {
  width: number | string
  height: number
  borderRadius?: number
  style?: any
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, borderRadius = 4, style }) => {
  const { isDarkMode } = useTheme()
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ).start()
  }, [])

  // Konvertiere width zu einer Zahl für die Animation, wenn es ein String ist
  const numericWidth = typeof width === "string" ? 300 : width

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-numericWidth, numericWidth],
  })

  // Angepasste Farben für helles und dunkles Theme
  const baseColor = isDarkMode ? "#2a2a2a" : "#f0f0f0"
  const highlightColor = isDarkMode ? "#3a3a3a" : "#f8f8f8"

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  shimmer: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    width: "100%",
    height: "100%",
  },
})

export default Shimmer
