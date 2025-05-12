"use client"

import type React from "react"
import { useState } from "react"
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar } from "react-native"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react-native"
import { useTheme } from "../theme/ThemeProvider"
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  type PinchGestureHandlerGestureEvent,
} from "react-native-gesture-handler"
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

interface ImageViewerProps {
  visible: boolean
  imageUri: string
  onClose: () => void
}

const { width, height } = Dimensions.get("window")

const ImageViewer: React.FC<ImageViewerProps> = ({ visible, imageUri, onClose }) => {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)

  // Animation values
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)

  // Pinch gesture handler
  const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startScale: number }>({
    onStart: (_, ctx) => {
      ctx.startScale = savedScale.value
    },
    onActive: (event, ctx) => {
      scale.value = ctx.startScale * event.scale
    },
    onEnd: () => {
      if (scale.value < 0.5) {
        scale.value = withTiming(0.5)
        savedScale.value = 0.5
      } else if (scale.value > 5) {
        scale.value = withTiming(5)
        savedScale.value = 5
      } else {
        savedScale.value = scale.value
      }
    },
  })

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  // Reset zoom
  const resetZoom = () => {
    scale.value = withTiming(1)
    savedScale.value = 1
  }

  // Zoom in
  const zoomIn = () => {
    const newScale = Math.min(savedScale.value + 0.5, 5)
    scale.value = withTiming(newScale)
    savedScale.value = newScale
  }

  // Zoom out
  const zoomOut = () => {
    const newScale = Math.max(savedScale.value - 0.5, 0.5)
    scale.value = withTiming(newScale)
    savedScale.value = newScale
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.container, { backgroundColor: "rgba(0,0,0,0.9)" }]}>
          <PinchGestureHandler onGestureEvent={pinchHandler}>
            <Animated.View style={styles.imageContainer}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[styles.image, animatedImageStyle]}
                resizeMode="contain"
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
              />
              {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}
            </Animated.View>
          </PinchGestureHandler>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={onClose}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
                <ZoomIn size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
                <ZoomOut size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={resetZoom}>
                <RotateCcw size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height * 0.8,
  },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
  controls: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  zoomControls: {
    flexDirection: "row",
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
})

export default ImageViewer
