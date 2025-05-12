"use client"

import type React from "react"
import { useState } from "react"
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native"
import { X, AlertTriangle } from "lucide-react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import Button from "./ui/Button"
import Box from "./ui/Box"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

interface ReportPostModalProps {
  visible: boolean
  onClose: () => void
  postId: string
  postOwnerId: string
}

const REPORT_REASONS = [
  { id: "inappropriate", label: "Unangemessener Inhalt" },
  { id: "harassment", label: "Belästigung oder Mobbing" },
  { id: "spam", label: "Spam oder irreführender Inhalt" },
  { id: "violence", label: "Gewalt oder gefährliches Verhalten" },
  { id: "hate_speech", label: "Hassrede" },
  { id: "illegal", label: "Illegale Aktivitäten" },
  { id: "privacy", label: "Verletzung der Privatsphäre" },
  { id: "other", label: "Anderer Grund" },
]

const ReportPostModal: React.FC<ReportPostModalProps> = ({ visible, onClose, postId, postOwnerId }) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Fehler", "Bitte wähle einen Grund für die Meldung aus.")
      return
    }

    if (!user) {
      Alert.alert("Fehler", "Du musst angemeldet sein, um einen Beitrag zu melden.")
      return
    }

    setIsSubmitting(true)

    try {
      // Find the label for the selected reason
      const reasonLabel = REPORT_REASONS.find((reason) => reason.id === selectedReason)?.label || selectedReason

      const { error } = await supabase.from("post_reports").insert({
        reporter_id: user.id,
        post_id: postId,
        post_owner_id: postOwnerId,
        reason: reasonLabel,
        additional_info: additionalInfo.trim() || null,
        status: "pending",
      })

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - user already reported this post
          Alert.alert("Bereits gemeldet", "Du hast diesen Beitrag bereits gemeldet. Deine Meldung wird überprüft.")
        } else {
          console.error("Error submitting report:", error)
          Alert.alert("Fehler", "Beim Melden des Beitrags ist ein Fehler aufgetreten. Bitte versuche es später erneut.")
        }
        return
      }

      Alert.alert(
        "Meldung eingereicht",
        "Vielen Dank für deine Meldung. Wir werden den Beitrag überprüfen und gegebenenfalls Maßnahmen ergreifen.",
        [{ text: "OK", onPress: onClose }],
      )
    } catch (error) {
      console.error("Error submitting report:", error)
      Alert.alert("Fehler", "Beim Melden des Beitrags ist ein Fehler aufgetreten. Bitte versuche es später erneut.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason(null)
    setAdditionalInfo("")
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text variant="subtitle" fontWeight="bold">
                  Beitrag melden
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color={theme.colors.secondaryText} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Box
                  padding="m"
                  marginBottom="m"
                  backgroundColor="surfaceBackground"
                  borderRadius="m"
                  borderLeftWidth={4}
                  style={{ borderLeftColor: theme.colors.warning }}
                >
                  <Box flexDirection="row" alignItems="center">
                    <AlertTriangle size={20} color={theme.colors.warning} style={{ marginRight: 8 }} />
                    <Text variant="body" fontWeight="500">
                      Beitrag melden?
                    </Text>
                  </Box>
                  <Text variant="small" color="secondaryText" marginTop="xs">
                    Deine Meldung ist anonym für andere Nutzer, aber nicht für Moderatoren.
                  </Text>
                </Box>

                <Text variant="subtitle" marginBottom="s">
                  Grund der Meldung:
                </Text>

                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonItem,
                      {
                        backgroundColor:
                          selectedReason === reason.id ? theme.colors.primaryLight : theme.colors.surfaceBackground,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                  >
                    <Text
                      variant="body"
                      color={selectedReason === reason.id ? "primary" : "primaryText"}
                      fontWeight={selectedReason === reason.id ? "600" : "normal"}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text variant="subtitle" marginTop="m" marginBottom="s">
                  Zusätzliche Informationen (optional):
                </Text>
                <View
                  style={[
                    styles.textInputContainer,
                    {
                      backgroundColor: theme.colors.surfaceBackground,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: theme.colors.primaryText,
                      },
                    ]}
                    value={additionalInfo}
                    onChangeText={setAdditionalInfo}
                    placeholder="Beschreibe das Problem genauer..."
                    placeholderTextColor={theme.colors.secondaryText}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Abbrechen"
                  onPress={handleClose}
                  variant="outline"
                  size="medium"
                  style={{ marginRight: 8, flex: 1 }}
                />
                <Button
                  title={isSubmitting ? "Wird gesendet..." : "Melden"}
                  onPress={handleSubmit}
                  variant="primary"
                  size="medium"
                  style={{ flex: 1 }}
                  disabled={!selectedReason || isSubmitting}
                  icon={isSubmitting ? <ActivityIndicator size="small" color="white" /> : undefined}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  reasonItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    height: 100,
  },
  textInput: {
    padding: 12,
    height: "100%",
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
})

export default ReportPostModal
