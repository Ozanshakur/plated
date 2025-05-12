"use client"

import React from "react"
import { Pressable, type PressableProps, Animated, StyleSheet } from "react-native"

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode
  scaleAmount?: number
  disabled?: boolean
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  scaleAmount = 0.97,
  disabled = false,
  style,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleAmount,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={styles.container}
      {...props}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          typeof style === "object" ? style : {},
          disabled && styles.disabled,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  disabled: {
    opacity: 0.6,
  },
})

export default AnimatedPressable
