"use client"

import type React from "react"
import { Image, StyleSheet, Dimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../navigation"
import { useTheme } from "../theme/ThemeProvider"
import Box from "../components/ui/Box"
import Text from "../components/ui/Text"
import Button from "../components/ui/Button"

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Welcome">

const { width } = Dimensions.get("window")

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>()
  const { theme } = useTheme()

  return (
    <Box flex={1} backgroundColor="mainBackground" padding="l">
      <Box flex={1} justifyContent="center" alignItems="center">
        <Image source={require("../../assets/plated-logo.png")} style={styles.logo} resizeMode="contain" />

        <Text variant="header" textAlign="center" marginTop="xl">
          Willkommen bei Plated
        </Text>

        <Text variant="body" textAlign="center" marginTop="m" marginBottom="xl">
          Verbinde dich mit anderen Autofahrern, teile Fotos und bleibe in Kontakt.
        </Text>

        <Box width="100%" marginTop="l">
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate("SignIn")}
            variant="primary"
            fullWidth
            size="large"
          />

          <Box height={16} />

          <Button
            title="Registrieren"
            onPress={() => navigation.navigate("SignUp")}
            variant="outline"
            fullWidth
            size="large"
          />

          <Box height={16} />

          <Button
            title="Als Gast fortfahren"
            onPress={() => navigation.navigate("Main")}
            variant="secondary"
            fullWidth
          />
        </Box>
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 20,
  },
})

export default WelcomeScreen
