"use client"

import type React from "react"
import { useState } from "react"
import { StyleSheet, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { useAuth } from "../../context/AuthContext"
import { profileService } from "../../lib/profile-service"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import { Mail, CheckCircle } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"

type VerifyEmailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

const VerifyEmailScreen: React.FC = () => {
  const navigation = useNavigation<VerifyEmailScreenNavigationProp>()
  const { user, refreshAuthStatus } = useAuth()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)

  const handleVerifyManually = async () => {
    if (!user) {
      Alert.alert("Fehler", "Du musst angemeldet sein, um deine E-Mail zu bestätigen.")
      return
    }

    setLoading(true)
    try {
      // Setze den Verifizierungsstatus manuell auf true
      const { error } = await profileService.setVerificationStatus(user.id, true)

      if (error) {
        throw error
      }

      // Aktualisiere den Auth-Status
      await refreshAuthStatus()

      Alert.alert(
        "E-Mail bestätigt",
        "Deine E-Mail wurde erfolgreich bestätigt. Du kannst nun alle Funktionen nutzen.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Main"),
          },
        ],
      )
    } catch (error) {
      console.error("Fehler bei der manuellen Bestätigung:", error)
      Alert.alert("Fehler", "Bei der Bestätigung ist ein Fehler aufgetreten. Bitte versuche es später erneut.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box flex={1} backgroundColor="mainBackground" padding="l" justifyContent="center" alignItems="center">
      <Card variant="elevated" style={styles.card}>
        <Box alignItems="center" marginBottom="l">
          <Box
            width={80}
            height={80}
            borderRadius="xl"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginBottom="m"
          >
            <Mail size={40} color={theme.colors.primary} />
          </Box>

          <Text variant="title" textAlign="center">
            E-Mail-Bestätigung
          </Text>

          <Text variant="body" textAlign="center" marginTop="m">
            Bitte bestätige deine E-Mail-Adresse, um alle Funktionen von Plated nutzen zu können.
          </Text>
        </Box>

        <Box marginBottom="m">
          <Text variant="body" textAlign="center">
            Wir haben eine Bestätigungs-E-Mail an deine E-Mail-Adresse gesendet. Bitte klicke auf den Link in der
            E-Mail, um deine Adresse zu bestätigen.
          </Text>
        </Box>

        <Box marginTop="l">
          <Button
            title="Ich habe meine E-Mail bestätigt"
            onPress={refreshAuthStatus}
            variant="primary"
            size="large"
            fullWidth
            icon={<CheckCircle size={20} color={theme.colors.buttonText} />}
          />

          <Box height={16} />

          <Button
            title={loading ? "Wird bestätigt..." : "Manuell bestätigen (nur für Tests)"}
            onPress={handleVerifyManually}
            variant="outline"
            size="medium"
            fullWidth
            loading={loading}
          />

          <Box height={16} />

          <Button
            title="Zurück zur Startseite"
            onPress={() => navigation.navigate("Main")}
            variant="secondary"
            size="medium"
            fullWidth
          />
        </Box>
      </Card>
    </Box>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
  },
})

export default VerifyEmailScreen
