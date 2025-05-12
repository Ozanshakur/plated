"use client"

import type React from "react"
import { useState } from "react"
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "../../theme/ThemeProvider"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import TextInput from "../../components/ui/TextInput"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import { ChevronLeft, HelpCircle, ChevronDown, ChevronUp, Send } from "lucide-react-native"

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0

type FAQItem = {
  question: string
  answer: string
  isOpen: boolean
}

const SupportScreen: React.FC = () => {
  const navigation = useNavigation()
  const { theme } = useTheme()
  const { user } = useAuth()

  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState(user?.email || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    {
      question: "Wie kann ich mein Kennzeichen ändern?",
      answer:
        "Du kannst dein Kennzeichen in den Profileinstellungen ändern. Gehe zu 'Profil' > 'Bearbeiten' und aktualisiere dein Kennzeichen. Beachte, dass das Kennzeichen einzigartig sein muss.",
      isOpen: false,
    },
    {
      question: "Wer kann meine Beiträge sehen?",
      answer:
        "Standardmäßig können alle Benutzer der App deine Beiträge sehen. Du kannst jedoch in den Datenschutzeinstellungen festlegen, wer deine Beiträge sehen kann.",
      isOpen: false,
    },
    {
      question: "Wie kann ich einen Benutzer blockieren?",
      answer:
        "Um einen Benutzer zu blockieren, gehe zu seinem Profil, tippe auf die drei Punkte in der oberen rechten Ecke und wähle 'Blockieren'. Blockierte Benutzer können deine Beiträge nicht sehen und dir keine Nachrichten senden.",
      isOpen: false,
    },
    {
      question: "Wie lösche ich meinen Account?",
      answer:
        "Um deinen Account zu löschen, gehe zu 'Einstellungen' > 'Konto' > 'Konto löschen'. Beachte, dass diese Aktion nicht rückgängig gemacht werden kann und alle deine Daten dauerhaft gelöscht werden.",
      isOpen: false,
    },
    {
      question: "Wie melde ich unangemessene Inhalte?",
      answer:
        "Um unangemessene Inhalte zu melden, tippe auf die drei Punkte neben dem Beitrag und wähle 'Melden'. Wähle dann den Grund für die Meldung aus und sende sie ab. Unser Team wird den Inhalt überprüfen und entsprechende Maßnahmen ergreifen.",
      isOpen: false,
    },
  ])

  const toggleFAQ = (index: number) => {
    const updatedFAQs = [...faqItems]
    updatedFAQs[index].isOpen = !updatedFAQs[index].isOpen
    setFaqItems(updatedFAQs)
  }

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Betreff ein.")
      return
    }

    if (!message.trim()) {
      Alert.alert("Fehler", "Bitte gib eine Nachricht ein.")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Fehler", "Bitte gib eine gültige E-Mail-Adresse ein.")
      return
    }

    try {
      setIsSubmitting(true)

      const { error } = await supabase.from("support_requests").insert({
        user_id: user?.id,
        subject: subject.trim(),
        message: message.trim(),
        email: email.trim(),
        status: "open",
      })

      if (error) throw error

      setShowSuccess(true)
      setSubject("")
      setMessage("")

      // Automatisch ausblenden nach 3 Sekunden
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Fehler beim Senden der Support-Anfrage:", error)
      Alert.alert("Fehler", "Beim Senden deiner Anfrage ist ein Fehler aufgetreten. Bitte versuche es später erneut.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
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
                Support & FAQ
              </Text>
            </Box>
            <Box width={60} />
          </Box>

          {/* Content */}
          <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Box padding="m">
              <Box flexDirection="row" alignItems="center" justifyContent="center" marginBottom="l">
                <HelpCircle size={32} color={theme.colors.primary} />
                <Text variant="title" marginLeft="s">
                  Hilfe & Support
                </Text>
              </Box>

              {/* FAQ Section */}
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Häufig gestellte Fragen
              </Text>

              {faqItems.map((item, index) => (
                <Card key={index} variant="outlined" style={[styles.faqCard, { marginBottom: 12 }]}>
                  <TouchableOpacity onPress={() => toggleFAQ(index)}>
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" padding="s">
                      <Text variant="subtitle" fontWeight="500" style={{ flex: 1 }}>
                        {item.question}
                      </Text>
                      {item.isOpen ? (
                        <ChevronUp size={20} color={theme.colors.primary} />
                      ) : (
                        <ChevronDown size={20} color={theme.colors.primary} />
                      )}
                    </Box>
                  </TouchableOpacity>

                  {item.isOpen && (
                    <Box
                      padding="m"
                      backgroundColor="surfaceBackground"
                      borderTopWidth={1}
                      borderTopColor="border"
                      borderRadius="s"
                    >
                      <Text variant="body">{item.answer}</Text>
                    </Box>
                  )}
                </Card>
              ))}

              {/* Support Form */}
              <Text variant="subtitle" fontWeight="bold" marginTop="l" marginBottom="m">
                Kontaktiere uns
              </Text>
              <Card variant="elevated" style={styles.formCard}>
                <Text variant="body" marginBottom="m">
                  Hast du eine Frage, die nicht in den FAQs beantwortet wird? Sende uns eine Nachricht und wir werden
                  uns so schnell wie möglich bei dir melden.
                </Text>

                <Box marginBottom="m">
                  <Text variant="caption" fontWeight="bold" marginBottom="xs">
                    Betreff
                  </Text>
                  <TextInput
                    placeholder="Betreff deiner Anfrage"
                    value={subject}
                    onChangeText={setSubject}
                    style={styles.input}
                  />
                </Box>

                <Box marginBottom="m">
                  <Text variant="caption" fontWeight="bold" marginBottom="xs">
                    E-Mail
                  </Text>
                  <TextInput
                    placeholder="Deine E-Mail-Adresse"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </Box>

                <Box marginBottom="m">
                  <Text variant="caption" fontWeight="bold" marginBottom="xs">
                    Nachricht
                  </Text>
                  <TextInput
                    placeholder="Beschreibe dein Anliegen..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={5}
                    style={[styles.input, styles.textArea]}
                    textAlignVertical="top"
                  />
                </Box>

                <Button
                  title="Anfrage senden"
                  onPress={handleSubmit}
                  variant="primary"
                  size="medium"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  icon={<Send size={18} color={theme.colors.buttonText} />}
                  fullWidth
                />
              </Card>

              <Text variant="caption" color="secondaryText" textAlign="center" marginTop="l">
                Wir bemühen uns, alle Anfragen innerhalb von 24-48 Stunden zu beantworten.
              </Text>
            </Box>
          </ScrollView>

          {/* Success Message */}
          {showSuccess && (
            <Box position="absolute" bottom={40} left={0} right={0} alignItems="center" justifyContent="center">
              <Box
                backgroundColor="success"
                paddingVertical="m"
                paddingHorizontal="l"
                borderRadius="m"
                flexDirection="row"
                alignItems="center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Box
                  width={24}
                  height={24}
                  borderRadius="m"
                  backgroundColor="cardBackground"
                  alignItems="center"
                  justifyContent="center"
                  marginRight="s"
                >
                  <Text style={{ color: theme.colors.success, fontWeight: "bold" }}>✓</Text>
                </Box>
                <Text style={{ color: theme.colors.buttonText, fontWeight: "bold" }}>
                  Anfrage erfolgreich gesendet!
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </KeyboardAvoidingView>
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
  faqCard: {
    overflow: "hidden",
  },
  formCard: {
    padding: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
})

export default SupportScreen
