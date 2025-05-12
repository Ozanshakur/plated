"use client"

import type React from "react"
import { StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "../../theme/ThemeProvider"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import { ChevronLeft, Shield } from "lucide-react-native"

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation()
  const { theme } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <Box flex={1} backgroundColor="mainBackground">
        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          paddingHorizontal="m"
          style={{ paddingTop: Platform.OS === "ios" ? 10 : STATUSBAR_HEIGHT + 10, paddingBottom: 10 }}
          backgroundColor="cardBackground"
          borderBottomWidth={1}
          borderBottomColor="border"
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Box flexDirection="row" alignItems="center">
              <ChevronLeft size={24} color={theme.colors.primary} />
              <Text variant="subtitle" color="primary">
                Zurück
              </Text>
            </Box>
          </TouchableOpacity>
          <Box flex={1} alignItems="center">
            <Text variant="subtitle" fontWeight="bold">
              Datenschutzerklärung
            </Text>
          </Box>
          <Box width={60} />
        </Box>

        {/* Content */}
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Box padding="m">
            <Box flexDirection="row" alignItems="center" justifyContent="center" marginBottom="l">
              <Shield size={32} color={theme.colors.primary} />
              <Text variant="title" marginLeft="s">
                Datenschutzerklärung
              </Text>
            </Box>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              1. Verantwortlicher
            </Text>
            <Text variant="body" marginBottom="m">
              Verantwortlich für die Datenverarbeitung in der Plated App ist:
              {"\n\n"}
              Plated GmbH
              {"\n"}
              Musterstraße 123
              {"\n"}
              12345 Musterstadt
              {"\n"}
              Deutschland
              {"\n\n"}
              E-Mail: datenschutz@plated-app.de
              {"\n"}
              Telefon: +49 123 456789
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              2. Welche Daten wir erheben
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Registrierungsdaten:</Text> Bei der Anmeldung erheben wir Ihren Benutzernamen,
              E-Mail-Adresse und Ihr Kennzeichen.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Profilinformationen:</Text> Biografie und andere Informationen, die Sie freiwillig
              in Ihrem Profil angeben.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Nutzungsdaten:</Text> Informationen darüber, wie Sie die App nutzen,
              einschließlich Ihrer Interaktionen mit Beiträgen und anderen Benutzern.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Geräteinformationen:</Text> Informationen über Ihr Mobilgerät, einschließlich
              Betriebssystem, Gerätetyp und Geräte-ID.
            </Text>
            <Text variant="body" marginBottom="m">
              <Text fontWeight="bold">Standortdaten:</Text> Mit Ihrer Zustimmung können wir auf Ihren Standort
              zugreifen, um bestimmte Funktionen der App zu ermöglichen.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              3. Zwecke der Datenverarbeitung
            </Text>
            <Text variant="body" marginBottom="s">
              • Bereitstellung und Verbesserung unserer Dienste
            </Text>
            <Text variant="body" marginBottom="s">
              • Ermöglichung der Kommunikation zwischen Benutzern
            </Text>
            <Text variant="body" marginBottom="s">
              • Personalisierung Ihrer Erfahrung
            </Text>
            <Text variant="body" marginBottom="s">
              • Sicherheit und Betrug-Prävention
            </Text>
            <Text variant="body" marginBottom="m">
              • Einhaltung gesetzlicher Verpflichtungen
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              4. Rechtsgrundlagen der Verarbeitung
            </Text>
            <Text variant="body" marginBottom="s">
              • Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO)
            </Text>
            <Text variant="body" marginBottom="s">
              • Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO)
            </Text>
            <Text variant="body" marginBottom="s">
              • Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
            </Text>
            <Text variant="body" marginBottom="m">
              • Erfüllung rechtlicher Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              5. Speicherdauer
            </Text>
            <Text variant="body" marginBottom="m">
              Wir speichern Ihre personenbezogenen Daten so lange, wie es für die Zwecke, für die sie erhoben wurden,
              erforderlich ist oder solange gesetzliche Aufbewahrungsfristen bestehen. Wenn Sie Ihr Konto löschen,
              werden Ihre personenbezogenen Daten innerhalb von 30 Tagen gelöscht, es sei denn, wir sind gesetzlich
              verpflichtet, sie länger aufzubewahren.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              6. Empfänger der Daten
            </Text>
            <Text variant="body" marginBottom="m">
              Wir geben Ihre personenbezogenen Daten nur an Dritte weiter, wenn dies zur Erfüllung unserer vertraglichen
              Pflichten erforderlich ist, wir gesetzlich dazu verpflichtet sind oder Sie eingewilligt haben. Zu diesen
              Dritten können gehören:
              {"\n\n"}• IT-Dienstleister und Cloud-Anbieter
              {"\n"}• Zahlungsdienstleister (falls zutreffend)
              {"\n"}• Andere Benutzer der Plated App (gemäß Ihren Privatsphäre-Einstellungen)
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              7. Datenübermittlung in Drittländer
            </Text>
            <Text variant="body" marginBottom="m">
              Einige unserer Dienstleister befinden sich möglicherweise außerhalb der EU/des EWR. In diesen Fällen
              stellen wir sicher, dass ein angemessenes Datenschutzniveau gewährleistet ist, entweder durch einen
              Angemessenheitsbeschluss der EU-Kommission, durch EU-Standardvertragsklauseln oder andere geeignete
              Garantien.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              8. Ihre Rechte
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Auskunftsrecht:</Text> Sie haben das Recht, Auskunft über die von uns
              verarbeiteten personenbezogenen Daten zu erhalten.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Recht auf Berichtigung:</Text> Sie können die Berichtigung unrichtiger oder die
              Vervollständigung unvollständiger Daten verlangen.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Recht auf Löschung:</Text> Unter bestimmten Umständen können Sie die Löschung
              Ihrer Daten verlangen.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Recht auf Einschränkung der Verarbeitung:</Text> Sie können die Einschränkung der
              Verarbeitung Ihrer Daten verlangen.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Recht auf Datenübertragbarkeit:</Text> Sie können verlangen, Ihre Daten in einem
              strukturierten, gängigen und maschinenlesbaren Format zu erhalten.
            </Text>
            <Text variant="body" marginBottom="s">
              <Text fontWeight="bold">Widerspruchsrecht:</Text> Sie können der Verarbeitung Ihrer Daten widersprechen.
            </Text>
            <Text variant="body" marginBottom="m">
              <Text fontWeight="bold">Beschwerderecht:</Text> Sie haben das Recht, sich bei einer Aufsichtsbehörde zu
              beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              9. Datensicherheit
            </Text>
            <Text variant="body" marginBottom="m">
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre personenbezogenen Daten gegen
              zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder gegen den Zugriff unberechtigter
              Personen zu schützen. Unsere Sicherheitsmaßnahmen werden entsprechend der technologischen Entwicklung
              fortlaufend verbessert.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              10. Cookies und ähnliche Technologien
            </Text>
            <Text variant="body" marginBottom="m">
              Unsere App verwendet Cookies und ähnliche Technologien, um die Benutzerfreundlichkeit zu verbessern und
              bestimmte Funktionen bereitzustellen. Sie können Ihre Geräteeinstellungen so konfigurieren, dass Cookies
              blockiert werden, was jedoch die Funktionalität der App einschränken kann.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              11. Änderungen dieser Datenschutzerklärung
            </Text>
            <Text variant="body" marginBottom="m">
              Wir behalten uns das Recht vor, diese Datenschutzerklärung zu ändern, um sie an geänderte Rechtslagen oder
              bei Änderungen des Dienstes oder der Datenverarbeitung anzupassen. Die Nutzer werden gebeten, sich
              regelmäßig über deren Inhalt zu informieren.
            </Text>

            <Text variant="subtitle" fontWeight="bold" marginTop="m" marginBottom="s">
              12. Kontakt
            </Text>
            <Text variant="body" marginBottom="m">
              Bei Fragen zum Datenschutz können Sie uns unter folgender E-Mail-Adresse kontaktieren:
              datenschutz@plated-app.de
            </Text>

            <Text variant="caption" color="secondaryText" textAlign="center" marginTop="l">
              Stand: Mai 2025
            </Text>
          </Box>
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
    paddingBottom: 40,
  },
})

export default PrivacyPolicyScreen
