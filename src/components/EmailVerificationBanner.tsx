"use client"

import type React from "react"
import { useState } from "react"
import { StyleSheet, TouchableOpacity, View, Animated } from "react-native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import { Mail, X, RefreshCw, Check } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { profileService } from "../lib/profile-service"

interface EmailVerificationBannerProps {
  onDismiss?: () => void
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ onDismiss }) => {
  const { isEmailVerified, user, refreshAuthStatus } = useAuth()
  const { theme } = useTheme()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Debug-Ausgaben
  console.log("EmailVerificationBanner - User:", user?.id)
  console.log("EmailVerificationBanner - isEmailVerified:", isEmailVerified)

  // Wenn die E-Mail bereits bestätigt wurde oder kein Benutzer angemeldet ist, zeige nichts an
  if (isEmailVerified || !user || dismissed) {
    console.log(
      "Banner wird nicht angezeigt: isEmailVerified=",
      isEmailVerified,
      "user=",
      !!user,
      "dismissed=",
      dismissed,
    )
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const handleRefresh = async () => {
    setLoading(true)
    await refreshAuthStatus()
    setLoading(false)
  }

  const handleManualVerify = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Setze den Verifizierungsstatus manuell auf true
      const { error } = await profileService.setVerificationStatus(user.id, true)

      if (error) {
        console.error("Fehler beim manuellen Verifizieren:", error)
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler"
        alert("Fehler beim Verifizieren: " + errorMessage)
      } else {
        alert("Verifizierung erfolgreich gesetzt!")
        await refreshAuthStatus()
      }
    } catch (error) {
      console.error("Unerwarteter Fehler:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Animated.View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.warning, "#FFA726"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Mail size={20} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>E-Mail-Bestätigung erforderlich</Text>
          <Text style={styles.text}>Bitte bestätige deine E-Mail-Adresse, um alle Funktionen nutzen zu können.</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#fff" }]}
              onPress={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={14} color={theme.colors.warning} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: theme.colors.warning }]}>
                {loading ? "Wird aktualisiert..." : "Status aktualisieren"}
              </Text>
            </TouchableOpacity>

            {/* Button für manuelle Verifizierung (nur für Testzwecke) */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "rgba(255,255,255,0.2)", marginLeft: 8 }]}
              onPress={handleManualVerify}
              disabled={loading}
            >
              <Check size={14} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{loading ? "Wird verifiziert..." : "Manuell verifizieren"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <X size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  text: {
    color: "#fff",
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 12,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
})

export default EmailVerificationBanner
