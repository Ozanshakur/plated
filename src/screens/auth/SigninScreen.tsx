"use client"

import type React from "react"
import { useState } from "react"
import { ScrollView, StyleSheet, Alert, View, TextInput as RNTextInput, TouchableOpacity } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "SignIn">

const SignInScreen: React.FC = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>()
  const { signIn } = useAuth()
  const { theme } = useTheme()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Fehler", "Bitte fülle alle Felder aus.")
      return
    }

    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        Alert.alert("Fehler bei der Anmeldung", error.message)
        return
      }

      // Erfolgreiche Anmeldung - keine Überprüfung der E-Mail-Bestätigung mehr
      // Navigiere zur Hauptseite
      navigation.navigate("Main")
    } catch (error) {
      Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Box padding="l" width="100%">
        <Text variant="title" marginBottom="l">
          Melde dich bei deinem Konto an
        </Text>

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
        </Box>

        <Button title="Anmelden" onPress={handleSignIn} loading={loading} fullWidth size="large" variant="primary" />

        <Box flexDirection="row" justifyContent="center" marginTop="l">
          <Text variant="body" color="secondaryText">
            Noch kein Konto?{" "}
          </Text>
          <Text variant="body" color="primary" onPress={() => navigation.navigate("SignUp")}>
            Registrieren
          </Text>
        </Box>
      </Box>
    </ScrollView>
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
})

export default SignInScreen
