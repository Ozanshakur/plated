"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { StyleSheet, ScrollView, View, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import {
  Camera,
  Check,
  ChevronLeft,
  RefreshCw,
  Upload,
  AlertTriangle,
  Clock,
  Shield,
  Car,
  FileText,
  CheckCircle2,
  ArrowRight,
  Bell,
} from "lucide-react-native"
import * as ImagePicker from "expo-image-picker"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { LinearGradient } from "expo-linear-gradient"

import { useTheme } from "../../theme/ThemeProvider"
import { useAuth } from "../../context/AuthContext"
import Text from "../../components/ui/Text"
import Box from "../../components/ui/Box"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import { verificationService } from "../../lib/verification-service"
import { areNotificationsEnabled, toggleNotifications } from "../../lib/notification-service"
import type { VerificationStatus } from "../../types/verification"

const VerificationScreen: React.FC = () => {
  const { theme } = useTheme()
  const navigation = useNavigation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("not_verified")
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [licensePlateImage, setLicensePlateImage] = useState<string | null>(null)
  const [dashboardImage, setDashboardImage] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Referenz für die erste Ladung
  const isFirstLoad = useRef(true)

  useEffect(() => {
    loadVerificationInfo()
    checkNotificationStatus()
  }, [])

  // Prüfe den Benachrichtigungsstatus
  const checkNotificationStatus = async () => {
    const enabled = await areNotificationsEnabled()
    setNotificationsEnabled(enabled)
  }

  // Benachrichtigungen umschalten
  const handleToggleNotifications = async () => {
    const newStatus = !notificationsEnabled
    await toggleNotifications(newStatus)
    setNotificationsEnabled(newStatus)

    Alert.alert(
      newStatus ? "Benachrichtigungen aktiviert" : "Benachrichtigungen deaktiviert",
      newStatus
        ? "Du wirst über Änderungen deines Verifizierungsstatus informiert."
        : "Du erhältst keine Benachrichtigungen mehr über deinen Verifizierungsstatus.",
    )
  }

  const loadVerificationInfo = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Lade Verifizierungsinformationen
      const verificationInfo = await verificationService.getVerificationInfo(user.id)

      if (verificationInfo) {
        setVerificationCode(verificationInfo.code)
        setVerificationStatus(verificationInfo.status)
        setDaysLeft(verificationInfo.daysLeft)

        // Wenn kein Code vorhanden ist, generiere einen neuen
        if (!verificationInfo.code) {
          const newCode = await verificationService.generateVerificationCode(user.id)
          if (newCode) {
            setVerificationCode(newCode)
          }
        }
      }

      // Lade vorhandene Bilder
      const images = await verificationService.getVerificationImages(user.id)

      const licensePlateImg = images.find((img) => img.image_type === "license_plate")
      const dashboardImg = images.find((img) => img.image_type === "dashboard")

      if (licensePlateImg && licensePlateImg.image_base64) {
        setLicensePlateImage(licensePlateImg.image_base64)
      }

      if (dashboardImg && dashboardImg.image_base64) {
        setDashboardImage(dashboardImg.image_base64)
      }
    } catch (error) {
      console.error("Fehler beim Laden der Verifizierungsinformationen:", error)
      Alert.alert("Fehler", "Die Verifizierungsinformationen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const refreshVerificationCode = async () => {
    if (!user) return

    setRefreshing(true)
    try {
      const newCode = await verificationService.generateVerificationCode(user.id)
      if (newCode) {
        setVerificationCode(newCode)
        Alert.alert("Erfolg", "Dein Verifizierungscode wurde aktualisiert.")
      } else {
        Alert.alert("Fehler", "Der Verifizierungscode konnte nicht aktualisiert werden.")
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Verifizierungscodes:", error)
      Alert.alert("Fehler", "Der Verifizierungscode konnte nicht aktualisiert werden.")
    } finally {
      setRefreshing(false)
    }
  }

  const pickImage = async (type: "license_plate" | "dashboard") => {
    if (!user) return

    // Berechtigungen anfordern
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Berechtigung erforderlich", "Bitte erlaube den Zugriff auf deine Fotos, um ein Bild auszuwählen.")
      return
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]

        // Komprimiere das Bild, um die Dateigröße zu reduzieren
        const manipResult = await manipulateAsync(selectedImage.uri, [{ resize: { width: 1200 } }], {
          compress: 0.7,
          format: SaveFormat.JPEG,
        })

        // Konvertiere das Bild zu Base64
        const base64 = await convertImageToBase64(manipResult.uri)

        if (base64) {
          // Speichere das Bild lokal
          if (type === "license_plate") {
            setLicensePlateImage(base64)
          } else {
            setDashboardImage(base64)
          }

          // Lade das Bild hoch
          const success = await verificationService.uploadVerificationImage(user.id, type, base64)

          if (!success) {
            Alert.alert("Fehler", "Das Bild konnte nicht hochgeladen werden. Bitte versuche es erneut.")
          }
        }
      }
    } catch (error) {
      console.error("Fehler beim Auswählen des Bildes:", error)
      Alert.alert("Fehler", "Das Bild konnte nicht ausgewählt werden. Bitte versuche es erneut.")
    }
  }

  const takePhoto = async (type: "license_plate" | "dashboard") => {
    if (!user) return

    // Berechtigungen anfordern
    const { status } = await ImagePicker.requestCameraPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Berechtigung erforderlich", "Bitte erlaube den Zugriff auf deine Kamera, um ein Foto aufzunehmen.")
      return
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]

        // Komprimiere das Bild, um die Dateigröße zu reduzieren
        const manipResult = await manipulateAsync(selectedImage.uri, [{ resize: { width: 1200 } }], {
          compress: 0.7,
          format: SaveFormat.JPEG,
        })

        // Konvertiere das Bild zu Base64
        const base64 = await convertImageToBase64(manipResult.uri)

        if (base64) {
          // Speichere das Bild lokal
          if (type === "license_plate") {
            setLicensePlateImage(base64)
          } else {
            setDashboardImage(base64)
          }

          // Lade das Bild hoch
          const success = await verificationService.uploadVerificationImage(user.id, type, base64)

          if (!success) {
            Alert.alert("Fehler", "Das Bild konnte nicht hochgeladen werden. Bitte versuche es erneut.")
          }
        }
      }
    } catch (error) {
      console.error("Fehler beim Aufnehmen des Fotos:", error)
      Alert.alert("Fehler", "Das Foto konnte nicht aufgenommen werden. Bitte versuche es erneut.")
    }
  }

  const convertImageToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error("Fehler beim Konvertieren des Bildes zu Base64:", error)
      return null
    }
  }

  const submitVerification = async () => {
    if (!user) return

    if (!licensePlateImage || !dashboardImage) {
      Alert.alert("Fehler", "Bitte lade beide erforderlichen Bilder hoch, bevor du die Verifizierung einreichst.")
      return
    }

    setSubmitting(true)
    try {
      const success = await verificationService.submitVerification(user.id)

      if (success) {
        setVerificationStatus("pending")
        Alert.alert(
          "Verifizierung eingereicht",
          "Deine Verifizierung wurde erfolgreich eingereicht und wird nun überprüft. Dies kann einige Zeit dauern.",
        )
      } else {
        Alert.alert(
          "Fehler",
          "Die Verifizierung konnte nicht eingereicht werden. Bitte stelle sicher, dass beide Bilder hochgeladen wurden.",
        )
      }
    } catch (error) {
      console.error("Fehler beim Einreichen der Verifizierung:", error)
      Alert.alert("Fehler", "Die Verifizierung konnte nicht eingereicht werden. Bitte versuche es später erneut.")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatusBadge = () => {
    let color = ""
    let icon = null
    let text = ""

    switch (verificationStatus) {
      case "verified":
        color = theme.colors.success
        icon = <Check size={16} color="#fff" />
        text = "Verifiziert"
        break
      case "pending":
        color = theme.colors.warning
        icon = <Clock size={16} color="#fff" />
        text = "In Bearbeitung"
        break
      case "rejected":
        color = theme.colors.error
        icon = <AlertTriangle size={16} color="#fff" />
        text = "Abgelehnt"
        break
      default:
        color = theme.colors.secondaryText
        icon = <AlertTriangle size={16} color="#fff" />
        text = "Nicht verifiziert"
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        {icon}
        <Text style={styles.statusText}>{text}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" marginTop="m">
            Lade Verifizierungsinformationen...
          </Text>
        </Box>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <Box flex={1} backgroundColor="mainBackground">
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + "99"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verifizierung</Text>
          {renderStatusBadge()}
        </LinearGradient>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Benachrichtigungseinstellung */}
          <TouchableOpacity
            style={[
              styles.notificationToggle,
              { backgroundColor: notificationsEnabled ? theme.colors.success + "20" : theme.colors.error + "20" },
            ]}
            onPress={handleToggleNotifications}
          >
            <Bell size={20} color={notificationsEnabled ? theme.colors.success : theme.colors.error} />
            <Text variant="body" style={{ marginLeft: 8, flex: 1 }}>
              {notificationsEnabled ? "Benachrichtigungen sind aktiviert" : "Benachrichtigungen sind deaktiviert"}
            </Text>
            <Text
              variant="small"
              style={{
                color: notificationsEnabled ? theme.colors.success : theme.colors.primary,
                fontWeight: "bold",
              }}
            >
              {notificationsEnabled ? "AN" : "AUS"}
            </Text>
          </TouchableOpacity>

          {/* Intro Card */}
          <Card variant="elevated" style={styles.introCard}>
            <Box flexDirection="row" alignItems="center" marginBottom="m">
              <Shield size={32} color={theme.colors.primary} />
              <Text variant="subtitle" fontWeight="bold" marginLeft="m">
                Hey, schön dass du da bist!
              </Text>
            </Box>
            <Text variant="body" style={styles.introText}>
              Wir möchten sicherstellen, dass du wirklich der Besitzer des Kennzeichens bist. Keine Sorge, wir speichern
              nur die nötigsten Daten und der Prozess ist super einfach! 😊
            </Text>

            {verificationStatus === "not_verified" && daysLeft !== null && (
              <View style={styles.timeReminderContainer}>
                <Clock size={20} color={theme.colors.warning} />
                <Text variant="body" style={styles.timeReminderText}>
                  Bitte verifiziere dein Konto innerhalb von <Text style={styles.daysLeftText}>{daysLeft} Tagen</Text>
                </Text>
              </View>
            )}
          </Card>

          {/* Verifizierungscode */}
          <Card variant="elevated" style={styles.codeCard}>
            <Text variant="subtitle" fontWeight="bold" style={styles.cardTitle}>
              Dein persönlicher Code
            </Text>

            <LinearGradient colors={["#f0f0f0", "#ffffff"]} style={styles.codeContainer}>
              <Text variant="title" fontWeight="bold" style={styles.codeText}>
                {verificationCode}
              </Text>
            </LinearGradient>

            <Button
              title="Code aktualisieren"
              onPress={refreshVerificationCode}
              variant="secondary"
              size="small"
              loading={refreshing}
              disabled={refreshing || ["pending", "verified"].includes(verificationStatus)}
              icon={<RefreshCw size={16} color={theme.colors.primary} />}
              style={styles.refreshButton}
            />
          </Card>

          {/* Anleitung */}
          <Card variant="elevated" style={styles.stepsCard}>
            <Text variant="subtitle" fontWeight="bold" style={styles.cardTitle}>
              So einfach geht's
            </Text>

            <View style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                <FileText size={24} color="#fff" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text variant="body" fontWeight="bold">
                  Schritt 1
                </Text>
                <Text variant="body">Schreibe deinen Code auf ein Blatt Papier</Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepContainer}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.success }]}>
                <Car size={24} color="#fff" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text variant="body" fontWeight="bold">
                  Schritt 2
                </Text>
                <Text variant="body">Mache ein Foto vom Code neben deinem Kennzeichen</Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepContainer}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.warning }]}>
                <Camera size={24} color="#fff" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text variant="body" fontWeight="bold">
                  Schritt 3
                </Text>
                <Text variant="body">Mache ein Foto vom Code auf deinem Armaturenbrett</Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepContainer}>
              <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.error }]}>
                <CheckCircle2 size={24} color="#fff" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text variant="body" fontWeight="bold">
                  Schritt 4
                </Text>
                <Text variant="body">Reiche beide Fotos zur Überprüfung ein</Text>
              </View>
            </View>

            <Text variant="small" color="secondaryText" style={styles.privacyNote}>
              🔒 Deine Daten sind sicher! Wir verwenden die Fotos nur zur Verifizierung und löschen sie danach.
            </Text>
          </Card>

          {/* Bildupload */}
          {(verificationStatus === "not_verified" || verificationStatus === "rejected") && (
            <>
              <Card variant="elevated" style={styles.uploadCard}>
                <Text variant="subtitle" fontWeight="bold" style={styles.cardTitle}>
                  Foto 1: Code & Kennzeichen
                </Text>

                {licensePlateImage ? (
                  <Box marginBottom="m">
                    <Image source={{ uri: licensePlateImage }} style={styles.uploadedImage} />
                    <Box flexDirection="row" marginTop="s">
                      <Button
                        title="Neu aufnehmen"
                        onPress={() => takePhoto("license_plate")}
                        variant="secondary"
                        size="small"
                        style={{ flex: 1, marginRight: 8 }}
                        icon={<Camera size={16} color={theme.colors.primary} />}
                      />
                      <Button
                        title="Aus Galerie"
                        onPress={() => pickImage("license_plate")}
                        variant="secondary"
                        size="small"
                        style={{ flex: 1 }}
                        icon={<Upload size={16} color={theme.colors.primary} />}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box marginBottom="m">
                    <TouchableOpacity style={styles.uploadButton} onPress={() => takePhoto("license_plate")}>
                      <Camera size={32} color={theme.colors.primary} />
                      <Text variant="body" color="primary" marginTop="s">
                        Tippe, um ein Foto aufzunehmen
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadAltButton} onPress={() => pickImage("license_plate")}>
                      <Text variant="small" color="primary">
                        Oder wähle ein Bild aus deiner Galerie
                      </Text>
                    </TouchableOpacity>
                  </Box>
                )}

                <Text variant="small" color="secondaryText" style={styles.uploadTip}>
                  💡 Tipp: Achte darauf, dass der Code und das Kennzeichen gut lesbar sind.
                </Text>
              </Card>

              <Card variant="elevated" style={styles.uploadCard}>
                <Text variant="subtitle" fontWeight="bold" style={styles.cardTitle}>
                  Foto 2: Code im Fahrzeug
                </Text>

                {dashboardImage ? (
                  <Box marginBottom="m">
                    <Image source={{ uri: dashboardImage }} style={styles.uploadedImage} />
                    <Box flexDirection="row" marginTop="s">
                      <Button
                        title="Neu aufnehmen"
                        onPress={() => takePhoto("dashboard")}
                        variant="secondary"
                        size="small"
                        style={{ flex: 1, marginRight: 8 }}
                        icon={<Camera size={16} color={theme.colors.primary} />}
                      />
                      <Button
                        title="Aus Galerie"
                        onPress={() => pickImage("dashboard")}
                        variant="secondary"
                        size="small"
                        style={{ flex: 1 }}
                        icon={<Upload size={16} color={theme.colors.primary} />}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box marginBottom="m">
                    <TouchableOpacity style={styles.uploadButton} onPress={() => takePhoto("dashboard")}>
                      <Camera size={32} color={theme.colors.primary} />
                      <Text variant="body" color="primary" marginTop="s">
                        Tippe, um ein Foto aufzunehmen
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadAltButton} onPress={() => pickImage("dashboard")}>
                      <Text variant="small" color="primary">
                        Oder wähle ein Bild aus deiner Galerie
                      </Text>
                    </TouchableOpacity>
                  </Box>
                )}

                <Text variant="small" color="secondaryText" style={styles.uploadTip}>
                  💡 Tipp: Platziere den Code gut sichtbar auf dem Armaturenbrett.
                </Text>
              </Card>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      submitting ||
                      !licensePlateImage ||
                      !dashboardImage ||
                      ["pending", "verified"].includes(verificationStatus)
                        ? theme.colors.primary + "80"
                        : theme.colors.primary,
                  },
                ]}
                onPress={submitVerification}
                disabled={
                  submitting ||
                  !licensePlateImage ||
                  !dashboardImage ||
                  ["pending", "verified"].includes(verificationStatus)
                }
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Verifizierung einreichen</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Status-Anzeige für "pending" */}
          {verificationStatus === "pending" && (
            <Card variant="elevated" style={styles.statusCard}>
              <Box alignItems="center" padding="m">
                <View style={[styles.statusIconContainer, { backgroundColor: theme.colors.warning + "20" }]}>
                  <Clock size={48} color={theme.colors.warning} />
                </View>
                <Text variant="subtitle" fontWeight="bold" marginTop="m" textAlign="center">
                  Deine Verifizierung wird überprüft
                </Text>
                <Text variant="body" marginTop="s" textAlign="center" color="secondaryText">
                  Wir schauen uns deine Bilder gerade an. Das dauert normalerweise nicht lange. Du erhältst eine
                  Benachrichtigung, sobald wir fertig sind!
                </Text>
              </Box>
            </Card>
          )}

          {/* Status-Anzeige für "verified" */}
          {verificationStatus === "verified" && (
            <Card variant="elevated" style={styles.statusCard}>
              <Box alignItems="center" padding="m">
                <View style={[styles.statusIconContainer, { backgroundColor: theme.colors.success + "20" }]}>
                  <Check size={48} color={theme.colors.success} />
                </View>
                <Text variant="subtitle" fontWeight="bold" marginTop="m" textAlign="center">
                  Juhu! Du bist verifiziert 🎉
                </Text>
                <Text variant="body" marginTop="s" textAlign="center" color="secondaryText">
                  Herzlichen Glückwunsch! Dein Konto wurde erfolgreich verifiziert. Du kannst jetzt alle Funktionen der
                  App uneingeschränkt nutzen.
                </Text>
              </Box>
            </Card>
          )}

          {/* Status-Anzeige für "rejected" */}
          {verificationStatus === "rejected" && (
            <Card variant="elevated" style={styles.statusCard}>
              <Box alignItems="center" padding="m">
                <View style={[styles.statusIconContainer, { backgroundColor: theme.colors.error + "20" }]}>
                  <AlertTriangle size={48} color={theme.colors.error} />
                </View>
                <Text variant="subtitle" fontWeight="bold" marginTop="m" textAlign="center">
                  Verifizierung nicht erfolgreich
                </Text>
                <Text variant="body" marginTop="s" textAlign="center" color="secondaryText">
                  Leider konnten wir deine Verifizierung nicht abschließen. Bitte überprüfe, ob der Code und das
                  Kennzeichen auf den Bildern gut sichtbar sind und versuche es noch einmal.
                </Text>
              </Box>
            </Card>
          )}
        </ScrollView>
      </Box>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 12,
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: "auto",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  notificationToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  introCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  introText: {
    lineHeight: 22,
  },
  timeReminderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  timeReminderText: {
    marginLeft: 8,
    flex: 1,
  },
  daysLeftText: {
    fontWeight: "bold",
  },
  codeCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  codeContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 28,
    letterSpacing: 8,
  },
  refreshButton: {
    alignSelf: "center",
  },
  stepsCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepDivider: {
    height: 20,
    width: 1,
    backgroundColor: "#e0e0e0",
    marginLeft: 20,
  },
  privacyNote: {
    marginTop: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  uploadCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  uploadButton: {
    width: "100%",
    height: 160,
    borderWidth: 2,
    borderColor: "rgba(98, 0, 238, 0.2)",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "rgba(98, 0, 238, 0.05)",
  },
  uploadAltButton: {
    width: "100%",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadedImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  uploadTip: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6200ee",
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  statusCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
})

export default VerificationScreen
