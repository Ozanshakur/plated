"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Pressable,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import {
  Send,
  ArrowLeft,
  User,
  Smile,
  X,
  MessageCircle,
  Flag,
  MoreVertical,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { usePolling } from "../../hooks/usePolling"
import { StatusBar } from "expo-status-bar"
import { LinearGradient } from "expo-linear-gradient"
import Shimmer from "../../components/ui/Shimmer"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { detectSensitiveData, getSensitiveDataTypeName } from "../../utils/sensitive-data-detector"

type ConversationScreenRouteProp = RouteProp<RootStackParamList, "Conversation">
type ConversationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Conversation">

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  is_from_me: boolean
}

type ReportType = "message" | "user"

const { width, height } = Dimensions.get("window")
const isTablet = width >= 768

// Common emojis for quick access
const EMOJIS = [
  "😊",
  "😂",
  "❤️",
  "👍",
  "😍",
  "🙏",
  "😎",
  "👋",
  "🔥",
  "🎉",
  "😁",
  "🤔",
  "😉",
  "🤗",
  "😢",
  "😅",
  "😴",
  "🤣",
  "😇",
  "😜",
  "👏",
  "🙌",
  "👌",
  "✌️",
  "🤞",
  "🙄",
  "😋",
  "😏",
  "🤫",
  "🤭",
  "🚗",
  "🏠",
  "🌍",
  "🌞",
  "🌈",
  "🍕",
  "🍺",
  "🎵",
  "⚽",
  "🏆",
]

// Report reason options
const REPORT_REASONS = [
  "Beleidigung oder Belästigung",
  "Unangemessene Inhalte",
  "Spam",
  "Betrug oder Täuschung",
  "Hassrede",
  "Gewalt oder gefährliche Inhalte",
  "Falsche Informationen",
  "Sonstiges",
]

const ConversationScreen: React.FC = () => {
  const route = useRoute<ConversationScreenRouteProp>()
  const navigation = useNavigation<ConversationScreenNavigationProp>()
  const { user, isAuthenticated } = useAuth()
  const { theme, isDarkMode } = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const insets = useSafeAreaInsets()

  const { userId, username } = route.params

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Report state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState<ReportType>("user")
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null)
  const [submittingReport, setSubmittingReport] = useState(false)

  // Sensitive data warning state
  const [showSensitiveDataWarning, setShowSensitiveDataWarning] = useState(false)
  const [detectedSensitiveData, setDetectedSensitiveData] = useState<string[]>([])
  const [pendingMessage, setPendingMessage] = useState("")

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
      setShowEmojiPicker(false)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
    })

    return () => {
      keyboardDidHideListener.remove()
      keyboardDidShowListener.remove()
    }
  }, [])

  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

  const fetchOrCreateConversation = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return null
    }

    try {
      setError(null)

      // First, try to find an existing conversation between these users
      const { data: existingParticipants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id)

      if (participantsError) throw participantsError

      if (!existingParticipants || existingParticipants.length === 0) {
        // No conversations for this user, create a new one
        return await createNewConversation()
      }

      // Get all conversation IDs where the current user is a participant
      const currentUserConversationIds = existingParticipants.map((p) => p.conversation_id)

      // Find conversations where the other user is also a participant
      const { data: otherUserParticipants, error: otherUserError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId)
        .in("conversation_id", currentUserConversationIds)

      if (otherUserError) throw otherUserError

      if (otherUserParticipants && otherUserParticipants.length > 0) {
        // Found an existing conversation with both users
        const conversationId = otherUserParticipants[0].conversation_id
        setConversationId(conversationId)
        return conversationId
      } else {
        // No shared conversation, create a new one
        return await createNewConversation()
      }
    } catch (error: any) {
      console.error("Error fetching conversation:", error)

      // If we've already retried a few times, show the error
      if (retryCount >= 2) {
        setError(`Fehler beim Abrufen der Konversation: ${error.message || "Unbekannter Fehler"}`)
        return null
      }

      // Otherwise, try a fallback approach
      setRetryCount(retryCount + 1)
      return await createNewConversation()
    }
  }

  // Create a new conversation
  const createNewConversation = async () => {
    try {
      console.log("Creating new conversation")

      // Create a new conversation directly
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ created_at: new Date().toISOString() })
        .select()
        .single()

      if (conversationError || !newConversation) {
        throw conversationError
      }

      // Add participants directly - first the current user
      const { error: currentUserError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConversation.id,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })

      if (currentUserError) {
        console.error("Error adding current user:", currentUserError)
        // Continue anyway to try adding the other user
      }

      // Then add the other user
      const { error: otherUserError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConversation.id,
        user_id: userId,
        created_at: new Date().toISOString(),
      })

      if (otherUserError) {
        console.error("Error adding other user:", otherUserError)
        // Continue anyway as the conversation was created
      }

      setConversationId(newConversation.id)
      return newConversation.id
    } catch (error: any) {
      console.error("Error in conversation creation:", error)
      setError(`Fehler beim Erstellen der Konversation: ${error.message || "Unbekannter Fehler"}`)
      return null
    }
  }

  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, user_id")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      const formattedMessages = data.map((message) => ({
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        user_id: message.user_id,
        is_from_me: message.user_id === user?.id,
      }))

      setMessages(formattedMessages)

      // Mark messages as read
      await markMessagesAsRead(convId)
    } catch (error: any) {
      console.error("Error loading messages:", error)
      setError(`Fehler beim Laden der Nachrichten: ${error.message || "Unbekannter Fehler"}`)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async (convId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", convId)
        .neq("user_id", user?.id)
        .eq("read", false)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const checkForSensitiveData = (message: string): boolean => {
    const sensitiveData = detectSensitiveData(message)

    if (sensitiveData) {
      // Get unique types of sensitive data detected
      const sensitiveTypes = [...new Set(sensitiveData.map((item) => getSensitiveDataTypeName(item.type)))]

      setDetectedSensitiveData(sensitiveTypes)
      setPendingMessage(message)
      setShowSensitiveDataWarning(true)
      return true
    }

    return false
  }

  const handleSendMessage = async () => {
    // Entfernt die Verifizierungsprüfung, damit Benutzer auch ohne Verifizierung chatten können
    if (!conversationId || !newMessage.trim() || !isAuthenticated || !user) {
      return
    }

    // Check for sensitive data before sending
    if (checkForSensitiveData(newMessage)) {
      return // Stop here and show warning
    }

    // If no sensitive data or user confirmed, proceed with sending
    await sendMessage(newMessage)
  }

  const sendMessage = async (messageContent: string) => {
    try {
      setSending(true)
      setError(null)

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user?.id,
          content: messageContent.trim(),
          created_at: new Date().toISOString(),
          read: false,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Add the new message to the list
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          content: data.content,
          created_at: data.created_at,
          user_id: data.user_id,
          is_from_me: true,
        },
      ])

      // Clear the input field
      setNewMessage("")

      // Scroll to the end of the list
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error("Error sending message:", error)
      setError(`Fehler beim Senden der Nachricht: ${error.message || "Unbekannter Fehler"}`)
    } finally {
      setSending(false)
    }
  }

  const handleConfirmSendSensitiveData = () => {
    setShowSensitiveDataWarning(false)
    sendMessage(pendingMessage)
    setPendingMessage("")
  }

  const handleCancelSendSensitiveData = () => {
    setShowSensitiveDataWarning(false)
    // Keep the message in the input field for editing
    setPendingMessage("")
  }

  // Polling for new messages
  const pollNewMessages = async () => {
    if (!conversationId || !isAuthenticated || !user) return

    try {
      // Only get messages that are newer than the latest message we already have
      const latestMessage = messages[messages.length - 1]
      let query = supabase
        .from("messages")
        .select("id, content, created_at, user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id) // Only messages from other users

      // If we already have messages, only get newer ones
      if (latestMessage) {
        query = query.gt("created_at", latestMessage.created_at)
      }

      const { data, error } = await query.order("created_at", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // Format the new messages
        const newMessages = data.map((message) => ({
          id: message.id,
          content: message.content,
          created_at: message.created_at,
          user_id: message.user_id,
          is_from_me: false,
        }))

        // Add the new messages
        setMessages((prev) => [...prev, ...newMessages])

        // Mark the new messages as read
        await markMessagesAsRead(conversationId)

        // Scroll to the end of the list
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    } catch (error) {
      console.error("Error fetching new messages:", error)
    }
  }

  useEffect(() => {
    const initializeConversation = async () => {
      const convId = await fetchOrCreateConversation()
      if (convId) {
        await fetchMessages(convId)
      }
    }

    initializeConversation()
  }, [isAuthenticated, user])

  // Use the polling hook for new messages
  usePolling(
    async () => {
      if (conversationId && isAuthenticated && user) {
        await pollNewMessages()
      }
    },
    3000, // Check for new messages every 3 seconds
    !!conversationId && isAuthenticated, // Only activate when we have a conversation and are logged in
  )

  const handleBackPress = () => {
    navigation.goBack()
  }

  const handleEmojiPress = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const toggleEmojiPicker = () => {
    Keyboard.dismiss()
    setShowEmojiPicker(!showEmojiPicker)
  }

  const handleRetry = async () => {
    setError(null)
    setLoading(true)
    setRetryCount(0)

    try {
      // Try a direct approach to create the conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ created_at: new Date().toISOString() })
        .select()
        .single()

      if (conversationError) throw conversationError

      // Add current user as participant
      const { error: currentUserError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConversation.id,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })

      if (currentUserError) throw currentUserError

      // Add other user as participant
      const { error: otherUserError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConversation.id,
        user_id: userId,
        created_at: new Date().toISOString(),
      })

      if (otherUserError) throw otherUserError

      setConversationId(newConversation.id)
      await fetchMessages(newConversation.id)
    } catch (error: any) {
      console.error("Error in retry:", error)
      setError(`Fehler beim erneuten Versuch: ${error.message || "Unbekannter Fehler"}`)
      setLoading(false)

      // Show an alert with more details for debugging
      Alert.alert(
        "Fehler beim Erstellen der Konversation",
        `Bitte versuche es später erneut oder kontaktiere den Support.\n\nDetails: ${error.message || "Unbekannter Fehler"}`,
        [{ text: "OK" }],
      )
    }
  }

  const handleLongPressMessage = (messageId: string, isFromMe: boolean) => {
    if (!isFromMe) {
      setShowMessageOptions(messageId)
    }
  }

  const handleReportUser = () => {
    setReportType("user")
    setReportedMessageId(null)
    setReportReason("")
    setCustomReason("")
    setShowReportModal(true)
  }

  const handleReportMessage = (messageId: string) => {
    setReportType("message")
    setReportedMessageId(messageId)
    setReportReason("")
    setCustomReason("")
    setShowMessageOptions(null)
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!user) return

    const finalReason = reportReason === "Sonstiges" ? customReason : reportReason

    if (!finalReason) {
      Alert.alert("Fehler", "Bitte gib einen Grund für die Meldung an.")
      return
    }

    setSubmittingReport(true)

    try {
      const reportData = {
        reporter_id: user.id,
        reported_user_id: userId,
        message_id: reportType === "message" ? reportedMessageId : null,
        reason: finalReason,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("reports").insert(reportData)

      if (error) throw error

      setShowReportModal(false)
      Alert.alert("Meldung eingereicht", "Vielen Dank für deine Meldung. Wir werden den Fall überprüfen.", [
        { text: "OK" },
      ])
    } catch (error: any) {
      console.error("Error submitting report:", error)
      Alert.alert("Fehler", `Die Meldung konnte nicht eingereicht werden: ${error.message || "Unbekannter Fehler"}`, [
        { text: "OK" },
      ])
    } finally {
      setSubmittingReport(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <Box flex={1} justifyContent="center" alignItems="center" padding="l">
          <Box
            width={80}
            height={80}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginBottom="l"
          >
            <User size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="title" marginBottom="m" textAlign="center">
            Anmeldung erforderlich
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l" color="secondaryText">
            Du musst angemeldet sein, um Nachrichten zu senden.
          </Text>
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate("SignIn")}
            variant="primary"
            size="large"
            fullWidth
          />
        </Box>
      </SafeAreaView>
    )
  }

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isFirstInGroup = index === 0 || messages[index - 1].is_from_me !== item.is_from_me
    const isLastInGroup = index === messages.length - 1 || messages[index + 1].is_from_me !== item.is_from_me

    return (
      <Pressable onLongPress={() => handleLongPressMessage(item.id, item.is_from_me)} delayLongPress={500}>
        <Box
          alignSelf={item.is_from_me ? "flex-end" : "flex-start"}
          maxWidth="80%"
          style={[isTablet && { maxWidth: "70%" }, { marginBottom: isLastInGroup ? 16 : 2 }]}
        >
          {isFirstInGroup && !item.is_from_me && (
            <Text variant="small" color="secondaryText" marginLeft="s" marginBottom="xs">
              {username}
            </Text>
          )}
          <Box
            backgroundColor={item.is_from_me ? "primary" : "surfaceBackground"}
            padding="m"
            borderRadius="l"
            style={[
              item.is_from_me ? styles.myMessageBubble : styles.theirMessageBubble,
              isFirstInGroup && (item.is_from_me ? styles.firstMyMessage : styles.firstTheirMessage),
              isLastInGroup && (item.is_from_me ? styles.lastMyMessage : styles.lastTheirMessage),
            ]}
          >
            <Text variant="body" color={item.is_from_me ? "buttonText" : "primaryText"}>
              {item.content}
            </Text>
          </Box>
          {isLastInGroup && (
            <Text
              variant="small"
              color="secondaryText"
              style={{ opacity: 0.7, marginTop: 4 }}
              alignSelf={item.is_from_me ? "flex-end" : "flex-start"}
              marginHorizontal="s"
            >
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: de,
              })}
            </Text>
          )}

          {/* Message options popup */}
          {showMessageOptions === item.id && (
            <Box
              position="absolute"
              right={item.is_from_me ? 0 : undefined}
              left={!item.is_from_me ? 0 : undefined}
              bottom="100%"
              marginBottom="s"
              backgroundColor="cardBackground"
              borderRadius="m"
              padding="s"
              shadowColor="black"
              shadowOpacity={0.1}
              shadowRadius={5}
              shadowOffset={{ width: 0, height: 2 }}
              style={{ elevation: 5 }}
            >
              <TouchableOpacity style={styles.messageOption} onPress={() => handleReportMessage(item.id)}>
                <Flag size={16} color={theme.colors.error} style={{ marginRight: 8 }} />
                <Text color="error">Nachricht melden</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.messageOption, { marginTop: 8 }]}
                onPress={() => setShowMessageOptions(null)}
              >
                <X size={16} color={theme.colors.secondaryText} style={{ marginRight: 8 }} />
                <Text color="secondaryText">Abbrechen</Text>
              </TouchableOpacity>
            </Box>
          )}
        </Box>
      </Pressable>
    )
  }

  const renderEmptyComponent = () => (
    <Box flex={1} justifyContent="center" alignItems="center" padding="l">
      {loading ? (
        <Box width="100%" padding="m">
          {[1, 2, 3].map((i) => (
            <Box key={i} marginBottom="m" alignSelf={i % 2 === 0 ? "flex-end" : "flex-start"} maxWidth="80%">
              <Shimmer width={150 + i * 30} height={40} borderRadius={12} />
            </Box>
          ))}
        </Box>
      ) : error ? (
        <Box alignItems="center" padding="m">
          <Text variant="subtitle" color="error" textAlign="center" marginBottom="m">
            Fehler
          </Text>
          <Text variant="body" color="secondaryText" textAlign="center" marginBottom="l">
            {error}
          </Text>
          <Button title="Erneut versuchen" onPress={handleRetry} variant="primary" size="medium" />
        </Box>
      ) : (
        <Box alignItems="center" padding="m">
          <Box
            width={80}
            height={80}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginBottom="l"
          >
            <MessageCircle size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="subtitle" textAlign="center" marginBottom="m">
            Keine Nachrichten
          </Text>
          <Text variant="body" textAlign="center" color="secondaryText" marginBottom="l">
            Es wurden noch keine Nachrichten in diesem Chat gesendet. Schreibe die erste Nachricht an {username}!
          </Text>
        </Box>
      )}
    </Box>
  )

  const renderEmojiPicker = () => (
    <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
      <TouchableWithoutFeedback onPress={() => setShowEmojiPicker(false)}>
        <View style={styles.emojiModalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.emojiPickerContainer,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderTopColor: theme.colors.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.emojiPickerHeader}>
                <Text variant="subtitle">Emojis</Text>
                <TouchableOpacity onPress={() => setShowEmojiPicker(false)} style={styles.closeButton}>
                  <X size={20} color={theme.colors.secondaryText} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.emojiGrid}>
                {EMOJIS.map((emoji, index) => (
                  <TouchableOpacity key={index} style={styles.emojiButton} onPress={() => handleEmojiPress(emoji)}>
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )

  const renderReportModal = () => (
    <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
      <TouchableWithoutFeedback onPress={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.reportContainer,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderTopColor: theme.colors.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.reportHeader}>
                <AlertTriangle size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                <Text variant="subtitle" color="error">
                  {reportType === "user" ? "Benutzer melden" : "Nachricht melden"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReportModal(false)}
                  style={[styles.closeButton, { marginLeft: "auto" }]}
                >
                  <X size={20} color={theme.colors.secondaryText} />
                </TouchableOpacity>
              </View>

              <Text variant="body" color="secondaryText" style={styles.reportDescription}>
                {reportType === "user"
                  ? `Du möchtest ${username} melden. Bitte wähle einen Grund für deine Meldung.`
                  : "Bitte wähle einen Grund für deine Meldung dieser Nachricht."}
              </Text>

              <ScrollView style={styles.reasonsContainer}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      reportReason === reason && {
                        backgroundColor: theme.colors.primaryLight,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setReportReason(reason)}
                  >
                    <Text variant="body" color={reportReason === reason ? "primary" : "primaryText"}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {reportReason === "Sonstiges" && (
                <TextInput
                  style={[
                    styles.customReasonInput,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.primaryText,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Bitte beschreibe den Grund für deine Meldung..."
                  placeholderTextColor={theme.colors.secondaryText}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                />
              )}

              <View style={styles.reportActions}>
                <Button
                  title="Abbrechen"
                  onPress={() => setShowReportModal(false)}
                  variant="secondary"
                  size="medium"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Melden"
                  onPress={submitReport}
                  variant="primary"
                  size="medium"
                  style={{ flex: 1, marginLeft: 8 }}
                  loading={submittingReport}
                  disabled={!reportReason || (reportReason === "Sonstiges" && !customReason)}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )

  const renderSensitiveDataWarning = () => (
    <Modal
      visible={showSensitiveDataWarning}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSensitiveDataWarning(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.sensitiveDataContainer,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <View style={styles.sensitiveDataHeader}>
            <Shield size={28} color={theme.colors.primary} />
            <Text variant="subtitle" style={styles.sensitiveDataTitle}>
              Achtung: Sensible Daten erkannt
            </Text>
          </View>

          <View style={styles.sensitiveDataContent}>
            <Text variant="body" style={styles.sensitiveDataText}>
              Deine Nachricht enthält möglicherweise sensible Daten:
            </Text>

            <View style={styles.sensitiveDataTypes}>
              {detectedSensitiveData.map((type, index) => (
                <View key={index} style={styles.sensitiveDataType}>
                  <Info size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text variant="body" style={{ fontWeight: "500" }}>
                    {type}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="body" style={[styles.sensitiveDataText, { marginTop: 12 }]}>
              Bitte sei vorsichtig beim Teilen persönlicher Informationen. Du bist selbst dafür verantwortlich, wem du
              deine Daten anvertraust.
            </Text>

            <Text variant="body" style={[styles.sensitiveDataText, { marginTop: 8, fontStyle: "italic" }]}>
              Möchtest du diese Nachricht trotzdem senden?
            </Text>
          </View>

          <View style={styles.sensitiveDataActions}>
            <Button
              title="Bearbeiten"
              onPress={handleCancelSendSensitiveData}
              variant="secondary"
              size="medium"
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Trotzdem senden"
              onPress={handleConfirmSendSensitiveData}
              variant="primary"
              size="medium"
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.cardBackground }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <Box
            width={40}
            height={40}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
          >
            <User size={20} color={theme.colors.primary} />
          </Box>
        </View>

        <View style={styles.headerTextContainer}>
          <Text variant="subtitle" fontWeight="600">
            {username}
          </Text>
        </View>

        <TouchableOpacity onPress={handleReportUser} style={styles.reportUserButton}>
          <MoreVertical size={24} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss()
            setShowMessageOptions(null)
          }}
        >
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={[
                styles.messagesList,
                messages.length === 0 && styles.emptyList,
                isTablet && styles.tabletMessagesList,
              ]}
              ListEmptyComponent={renderEmptyComponent}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: !loading })
                }
              }}
              onLayout={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false })
                }
              }}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <TouchableOpacity onPress={toggleEmojiPicker} style={styles.emojiToggleButton}>
            <Smile size={24} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.primaryText,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Nachricht schreiben..."
            placeholderTextColor={theme.colors.secondaryText}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Send size={20} color="white" />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Picker Modal */}
      {renderEmojiPicker()}

      {/* Report Modal */}
      {renderReportModal()}

      {/* Sensitive Data Warning Modal */}
      {renderSensitiveDataWarning()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  avatarContainer: {
    marginLeft: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  reportUserButton: {
    padding: 8,
    borderRadius: 20,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  tabletMessagesList: {
    paddingHorizontal: 32,
    alignSelf: "center",
    maxWidth: 800,
    width: "100%",
  },
  myMessageBubble: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  firstMyMessage: {
    borderTopRightRadius: 4,
  },
  lastMyMessage: {
    borderBottomRightRadius: 20,
  },
  firstTheirMessage: {
    borderTopLeftRadius: 4,
  },
  lastTheirMessage: {
    borderBottomLeftRadius: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  emojiToggleButton: {
    padding: 8,
    marginRight: 8,
  },
  sendButton: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  sendButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledSendButton: {
    opacity: 0.5,
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  emojiPickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 16,
    maxHeight: 300,
  },
  emojiPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  emojiButton: {
    width: "12.5%", // 8 emojis per row
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  emoji: {
    fontSize: 24,
  },
  messageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reportContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 16,
    maxHeight: 500,
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  reportDescription: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reasonsContainer: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  reasonOption: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  customReasonInput: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sensitiveDataContainer: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sensitiveDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sensitiveDataTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  sensitiveDataContent: {
    marginBottom: 20,
  },
  sensitiveDataText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sensitiveDataTypes: {
    marginTop: 12,
    marginBottom: 4,
  },
  sensitiveDataType: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sensitiveDataActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

export default ConversationScreen
