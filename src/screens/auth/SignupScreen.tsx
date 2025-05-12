"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { Mail, Lock, User, Car, Eye, EyeOff, CheckSquare, Square } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { getCityInfo } from "../../utils/license-plate-utils"
import { profileService } from "../../lib/profile-service"

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "SignUp">

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>()
  const { signUp } = useAuth()
  const { theme } = useTheme()
  const scrollViewRef = useRef<ScrollView>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [licensePart1, setLicensePart1] = useState("")
  const [licensePart2, setLicensePart2] = useState("")
  const [licensePart3, setLicensePart3] = useState("")
  const [loading, setLoading] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingLicense, setCheckingLicense] = useState(false)
  const [licenseAvailable, setLicenseAvailable] = useState<boolean | null>(null)
  const [cityInfo, setCityInfo] = useState<{ city: string; message: string; emoji: string } | null>(null)
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false)

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
    })

    return () => {
      keyboardDidHideListener.remove()
      keyboardDidShowListener.remove()
    }
  }, [])

  // Überprüfe Benutzernamen-Verfügbarkeit
  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameAvailable(null)
        return
      }

      setCheckingUsername(true)
      try {
        const { available, error } = await profileService.isUsernameAvailable(username)

        if (error) {
          console.error("Fehler bei der Überprüfung des Benutzernamens:", error)
          setUsernameAvailable(null)
        } else {
          setUsernameAvailable(available)
        }
      } catch (error) {
        console.error("Unerwarteter Fehler:", error)
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timer = setTimeout(checkUsername, 500)
    return () => clearTimeout(timer)
  }, [username])

  // Überprüfe Kennzeichen-Verfügbarkeit und erkenne Stadt
  useEffect(() => {
    // Stadt erkennen
    if (licensePart1) {
      const info = getCityInfo(licensePart1)
      setCityInfo(info)
    } else {
      setCityInfo(null)
    }

    // Verfügbarkeit prüfen
    const checkLicense = async () => {
      if (!isValidGermanLicensePlate()) {
        setLicenseAvailable(null)
        return
      }

      const fullLicensePlate = getFullLicensePlate()
      setCheckingLicense(true)
      try {
        const { available, error } = await profileService.isLicensePlateAvailable(fullLicensePlate)

        if (error) {
          console.error("Fehler bei der Überprüfung des Kennzeichens:", error)
          setLicenseAvailable(null)
        } else {
          setLicenseAvailable(available)
        }
      } catch (error) {
        console.error("Unerwarteter Fehler:", error)
        setLicenseAvailable(null)
      } finally {
        setCheckingLicense(false)
      }
    }

    const timer = setTimeout(checkLicense, 500)
    return () => clearTimeout(timer)
  }, [licensePart1, licensePart2, licensePart3])

  // Validierung für deutsches Kennzeichen
  const isValidGermanLicensePlate = () => {
    // Erste Gruppe: 1-3 Buchstaben
    const isValidPart1 = /^[A-Z]{1,3}$/.test(licensePart1)
    // Zweite Gruppe: 1-2 Buchstaben
    const isValidPart2 = /^[A-Z]{1,2}$/.test(licensePart2)
    // Dritte Gruppe: 1-4 Ziffern
    const isValidPart3 = /^[0-9]{1,4}$/.test(licensePart3)

    return isValidPart1 && isValidPart2 && isValidPart3
  }

  // Formatiere die Eingabe für Teil 1 (nur Buchstaben, max 3)
  const handleLicensePart1Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3)
    setLicensePart1(formatted)
  }

  // Formatiere die Eingabe für Teil 2 (nur Buchstaben, max 2)
  const handleLicensePart2Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 2)
    setLicensePart2(formatted)
  }

  // Formatiere die Eingabe für Teil 3 (nur Zahlen, max 4)
  const handleLicensePart3Change = (text: string) => {
    const formatted = text.replace(/[^0-9]/g, "").slice(0, 4)
    setLicensePart3(formatted)
  }

  // Vollständiges Kennzeichen mit Bindestrichen
  const getFullLicensePlate = () => {
    return `${licensePart1}-${licensePart2}-${licensePart3}`
  }

  // Validiere alle Eingaben
  const validateInputs = () => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      Alert.alert("Fehler", "Bitte gib eine gültige E-Mail-Adresse ein.")
      return false
    }

    if (!username || username.length < 3) {
      Alert.alert("Fehler", "Der Benutzername muss mindestens 3 Zeichen lang sein.")
      return false
    }

    if (usernameAvailable === false) {
      Alert.alert("Fehler", "Dieser Benutzername ist bereits vergeben.")
      return false
    }

    if (!isValidGermanLicensePlate()) {
      Alert.alert("Fehler", "Bitte gib ein gültiges deutsches Kennzeichen ein.")
      return false
    }

    if (licenseAvailable === false) {
      Alert.alert("Fehler", "Dieses Kennzeichen ist bereits registriert.")
      return false
    }

    if (!password || password.length < 8) {
      Alert.alert("Fehler", "Das Passwort muss mindestens 8 Zeichen lang sein.")
      return false
    }

    if (!privacyPolicyAccepted) {
      Alert.alert("Fehler", "Bitte akzeptiere die Datenschutzrichtlinien, um fortzufahren.")
      return false
    }

    return true
  }

  const handleSignUp = async () => {
    if (!validateInputs()) {
      return
    }

    setLoading(true)

    try {
      const fullLicensePlate = getFullLicensePlate()

      // Debugging: Zeige die Daten, die an signUp gesendet werden
      console.log("Registrierungsdaten:", {
        email,
        password,
        username,
        licensePlate: fullLicensePlate,
      })

      // Verwende den neuen Registrierungsprozess
      const { error } = await signUp(email, password, username, fullLicensePlate)

      if (error) {
        console.error("Registrierungsfehler:", error)
        Alert.alert("Fehler bei der Registrierung", error.message || "Ein unbekannter Fehler ist aufgetreten.")
        return
      }

      Alert.alert(
        "Registrierung erfolgreich",
        "Dein Konto wurde erfolgreich erstellt. Bitte überprüfe deine E-Mails, um deine E-Mail-Adresse zu bestätigen.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("SignIn"),
          },
        ],
      )
    } catch (error) {
      console.error("Unerwarteter Fehler:", error)
      Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Box padding="l" width="100%">
          <Text variant="title" marginBottom="l">
            Erstelle dein Plated-Konto
          </Text>

          <Box marginBottom="m">
            <Text variant="caption" marginBottom="xs">
              Benutzername
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    usernameAvailable === true
                      ? theme.colors.success
                      : usernameAvailable === false
                        ? theme.colors.error
                        : theme.colors.border,
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <User size={20} color={theme.colors.secondaryText} />
              </View>
              <RNTextInput
                style={[styles.input, { color: theme.colors.primaryText }]}
                placeholder="Dein Benutzername"
                placeholderTextColor={theme.colors.secondaryText}
                value={username}
                onChangeText={setUsername}
              />
              {checkingUsername && <ActivityIndicator size="small" color={theme.colors.primary} />}
              {usernameAvailable === true && (
                <Text variant="small" color="success">
                  ✓
                </Text>
              )}
              {usernameAvailable === false && (
                <Text variant="small" color="error">
                  ✗
                </Text>
              )}
            </View>
            <Text
              variant="caption"
              color={usernameAvailable === true ? "success" : usernameAvailable === false ? "error" : "secondaryText"}
            >
              {usernameAvailable === true
                ? "Benutzername verfügbar"
                : usernameAvailable === false
                  ? "Benutzername bereits vergeben"
                  : "Mindestens 3 Zeichen"}
            </Text>
          </Box>

          <Input
            label="E-Mail"
            placeholder="deine@email.de"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Mail size={20} color={theme.colors.secondaryText} />}
          />

          <Box marginBottom="m">
            <Text variant="small" marginBottom="xs">
              Kennzeichen
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    licenseAvailable === true
                      ? theme.colors.success
                      : licenseAvailable === false
                        ? theme.colors.error
                        : theme.colors.border,
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <Car size={20} color={theme.colors.secondaryText} />
              </View>
              <View style={styles.licenseContainer}>
                <RNTextInput
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 60 }]}
                  placeholder="HH"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart1}
                  onChangeText={handleLicensePart1Change}
                  autoCapitalize="characters"
                  maxLength={3}
                />
                <Text variant="body" style={styles.licenseSeparator}>
                  -
                </Text>
                <RNTextInput
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 40 }]}
                  placeholder="OZ"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart2}
                  onChangeText={handleLicensePart2Change}
                  autoCapitalize="characters"
                  maxLength={2}
                />
                <Text variant="body" style={styles.licenseSeparator}>
                  -
                </Text>
                <RNTextInput
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 70 }]}
                  placeholder="1997"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart3}
                  onChangeText={handleLicensePart3Change}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              {checkingLicense && <ActivityIndicator size="small" color={theme.colors.primary} />}
              {licenseAvailable === true && (
                <Text variant="small" color="success">
                  ✓
                </Text>
              )}
              {licenseAvailable === false && (
                <Text variant="small" color="error">
                  ✗
                </Text>
              )}
            </View>
            {cityInfo ? (
              <Box
                marginTop="xs"
                paddingVertical="xs"
                paddingHorizontal="s"
                backgroundColor="surfaceBackground"
                borderRadius="s"
                borderLeftWidth={3}
                style={{ borderLeftColor: theme.colors.primary }}
              >
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  {cityInfo.emoji} {cityInfo.city}: {cityInfo.message}
                </Text>
              </Box>
            ) : licenseAvailable !== null ? (
              <Text variant="caption" color={licenseAvailable ? "success" : "error"}>
                {licenseAvailable ? "Kennzeichen verfügbar" : "Kennzeichen bereits registriert"}
              </Text>
            ) : (
              <Text variant="caption" color="secondaryText">
                Format: Stadt-Buchstaben-Zahlen (z.B. HH-OZ-1997)
              </Text>
            )}
          </Box>

          <Box marginBottom="m">
            <Text variant="caption" marginBottom="xs">
              Passwort
            </Text>
            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <View style={styles.iconContainer}>
                <Lock size={20} color={theme.colors.secondaryText} />
              </View>
              <RNTextInput
                style={[styles.input, { color: theme.colors.primaryText, flex: 1 }]}
                placeholder="Dein Passwort"
                placeholderTextColor={theme.colors.secondaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                {showPassword ? (
                  <EyeOff size={20} color={theme.colors.secondaryText} />
                ) : (
                  <Eye size={20} color={theme.colors.secondaryText} />
                )}
              </TouchableOpacity>
            </View>
            <Text variant="caption" color="secondaryText">
              Mindestens 8 Zeichen
            </Text>
          </Box>

          <Box marginBottom="m">
            <TouchableOpacity
              onPress={() => setPrivacyPolicyAccepted(!privacyPolicyAccepted)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {privacyPolicyAccepted ? (
                <CheckSquare size={20} color={theme.colors.primary} />
              ) : (
                <Square size={20} color={theme.colors.secondaryText} />
              )}
              <Text variant="body" style={{ marginLeft: 8 }}>
                Ich akzeptiere die{" "}
                <Text variant="body" color="primary" onPress={() => navigation.navigate("PrivacyPolicy")}>
                  Datenschutzrichtlinien
                </Text>
              </Text>
            </TouchableOpacity>
          </Box>

          <Button
            title={loading ? "Registriere..." : "Registrieren"}
            onPress={handleSignUp}
            loading={loading}
            fullWidth
            size="large"
            variant="primary"
            style={{ marginTop: 20 }}
          />

          <Box flexDirection="row" justifyContent="center" marginTop="l" marginBottom="xxl">
            <Text variant="body" color="secondaryText">
              Bereits ein Konto?{" "}
            </Text>
            <Text variant="body" color="primary" onPress={() => navigation.navigate("SignIn")}>
              Anmelden
            </Text>
          </Box>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  licenseContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  licenseInput: {
    height: 50,
    fontSize: 16,
    textAlign: "center",
  },
  licenseSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 8,
  },
})

export default SignUpScreen
