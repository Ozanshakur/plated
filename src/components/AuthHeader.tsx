"use client"

import type React from "react"
import { View, TouchableOpacity, StyleSheet, Animated, Pressable } from "react-native"
import { useNavigation, CommonActions } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { LogOut, User } from "lucide-react-native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import type { RootStackParamList } from "../navigation"
import { LinearGradient } from "expo-linear-gradient"
import { useRef } from "react"

type AuthHeaderNavigationProp = NativeStackNavigationProp<RootStackParamList>

interface AuthHeaderProps {
  title?: string
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ title = "Plated" }) => {
  const navigation = useNavigation<AuthHeaderNavigationProp>()
  const { isAuthenticated, signOut, user } = useAuth()
  const { theme } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current

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

  // Funktion zum Navigieren zu einem Tab innerhalb des MainTabNavigator
  const navigateToTab = (tabName: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Main",
        params: {},
      }),
    )
    // Wir können nicht direkt zum Tab navigieren, aber wir können einen Event auslösen,
    // der vom MainTabNavigator abgefangen werden kann
    // In einer realen App würden wir hier einen besseren Mechanismus verwenden
    setTimeout(() => {
      // Diese Verzögerung ist ein Hack, um sicherzustellen, dass wir zuerst zum Main-Screen navigieren
      navigation.dispatch(
        CommonActions.navigate({
          name: "Main",
          params: { screen: tabName },
        }),
      )
    }, 100)
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.mainBackground,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.titleContainer}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.logoGradient}
        >
          <Text style={styles.logoText}>P</Text>
        </LinearGradient>
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        {isAuthenticated ? (
          // Angemeldet: Zeige Benutzerinfo und Abmelden-Button
          <View style={styles.userContainer}>
            <Pressable
              onPress={() => navigateToTab("Profile")}
              style={styles.profileButton}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View style={[styles.profileButtonInner, { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.profileGradient}
                >
                  <User size={14} color="#fff" />
                </LinearGradient>
                <Text variant="small" style={styles.username}>
                  {user?.user_metadata?.username || "Profil"}
                </Text>
              </Animated.View>
            </Pressable>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.cardBackground }]}
              onPress={signOut}
            >
              <LogOut size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          // Nicht angemeldet: Zeige Anmelden/Registrieren-Buttons
          <View style={styles.authButtonsContainer}>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: theme.colors.cardBackground }]}
              onPress={() => navigation.navigate("SignIn")}
            >
              <Text variant="small" style={{ color: theme.colors.primary }}>
                Anmelden
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.authButtonGradient} onPress={() => navigation.navigate("SignUp")}>
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text variant="small" style={{ color: "#fff" }}>
                  Registrieren
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  logoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  authButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  authButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  authButtonGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  profileButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  profileButtonInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileGradient: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  username: {
    marginLeft: 6,
    marginRight: 6,
  },
})

export default AuthHeader
