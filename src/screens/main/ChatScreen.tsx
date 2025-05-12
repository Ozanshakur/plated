"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { User, MessageCircle, Search } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { usePolling } from "../../hooks/usePolling"
import EmailVerificationBanner from "../../components/EmailVerificationBanner"
import { LinearGradient } from "expo-linear-gradient"
import Shimmer from "../../components/ui/Shimmer"
import AnimatedPressable from "../../components/ui/AnimatedPressable"
import { StatusBar } from "expo-status-bar"

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Chat">

type Conversation = {
  id: string
  other_user_id: string
  other_username: string
  last_message: string
  last_message_time: string
  unread_count: number
}

const { width } = Dimensions.get("window")
const isTablet = width >= 768

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>()
  const { user, isAuthenticated, isEmailVerified } = useAuth()
  const { theme, isDarkMode } = useTheme()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchConversations = async (showRefreshing = false) => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    if (showRefreshing) {
      setRefreshing(true)
    }

    try {
      // Hole alle Konversationen, an denen der Benutzer teilnimmt
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id)

      if (participantError) {
        throw participantError
      }

      if (!participantData || participantData.length === 0) {
        setConversations([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      const conversationIds = participantData.map((p) => p.conversation_id)

      // Hole für jede Konversation den anderen Teilnehmer
      const conversationsWithDetails = await Promise.all(
        conversationIds.map(async (conversationId) => {
          // Hole den anderen Teilnehmer
          const { data: otherParticipantData } = await supabase
            .from("conversation_participants")
            .select("user_id, profiles(username)")
            .eq("conversation_id", conversationId)
            .neq("user_id", user.id)
            .single()

          if (!otherParticipantData) {
            return null
          }

          // Extrahiere den Benutzernamen korrekt
          let otherUsername = "Unbekannter Benutzer"

          if (otherParticipantData.profiles) {
            const profileData = otherParticipantData.profiles
            if (
              Array.isArray(profileData) &&
              profileData.length > 0 &&
              profileData[0] &&
              typeof profileData[0] === "object"
            ) {
              otherUsername = profileData[0].username || "Unbekannter Benutzer"
            } else if (typeof profileData === "object" && profileData !== null) {
              otherUsername = (profileData as any).username || "Unbekannter Benutzer"
            }
          }

          // Hole die letzte Nachricht
          const { data: lastMessageData } = await supabase
            .from("messages")
            .select("content, created_at, user_id")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          // Zähle ungelesene Nachrichten
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversationId)
            .eq("read", false)
            .neq("user_id", user.id)

          return {
            id: conversationId,
            other_user_id: otherParticipantData.user_id,
            other_username: otherUsername,
            last_message: lastMessageData?.content || "Keine Nachrichten",
            last_message_time: lastMessageData?.created_at || new Date().toISOString(),
            unread_count: unreadCount || 0,
          }
        }),
      )

      // Filtere null-Werte und sortiere nach letzter Nachrichtenzeit
      const validConversations = conversationsWithDetails
        .filter((c): c is Conversation => c !== null)
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())

      setConversations(validConversations)
    } catch (error) {
      console.error("Fehler beim Laden der Konversationen:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [isAuthenticated, user])

  // Verwende den Polling-Hook, um regelmäßig nach neuen Nachrichten zu suchen
  usePolling(
    async () => {
      if (isAuthenticated && user) {
        await fetchConversations()
      }
    },
    5000, // Alle 5 Sekunden aktualisieren
    isAuthenticated, // Nur aktivieren, wenn der Benutzer angemeldet ist
  )

  const handleConversationPress = (conversation: Conversation) => {
    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail" as any)
      return
    }

    navigation.navigate("Conversation", {
      userId: conversation.other_user_id,
      username: conversation.other_username,
    })
  }

  const handleSearchPress = () => {
    // Use type assertion to navigate to the Main tab with Search screen
    ;(navigation as any).navigate("Main", { screen: "Search" })
  }

  if (!isAuthenticated) {
    return (
      <Box flex={1} backgroundColor="mainBackground">
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
            <MessageCircle size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="title" marginBottom="m" textAlign="center">
            Anmeldung erforderlich
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l" color="secondaryText">
            Du musst angemeldet sein, um deine Nachrichten zu sehen und mit anderen Fahrern zu kommunizieren.
          </Text>
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate("SignIn")}
            variant="primary"
            size="large"
            fullWidth
          />
        </Box>
      </Box>
    )
  }

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <AnimatedPressable onPress={() => handleConversationPress(item)}>
      <Card
        variant={item.unread_count > 0 ? "subtle" : "default"}
        style={[
          styles.conversationCard,
          isTablet && styles.tabletCard,
          item.unread_count > 0 && { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
        ]}
      >
        <Box flexDirection="row" alignItems="center">
          <Box
            width={50}
            height={50}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginRight="m"
            style={styles.avatarShadow}
          >
            <User size={24} color={theme.colors.primary} />
          </Box>

          <Box flex={1}>
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text variant="subtitle" fontWeight="600">
                {item.other_username}
              </Text>
              <Text variant="small" color="secondaryText">
                {formatDistanceToNow(new Date(item.last_message_time), {
                  addSuffix: true,
                  locale: de,
                })}
              </Text>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginTop="xs">
              <Text
                variant="body"
                numberOfLines={1}
                style={{ flex: 1 }}
                color={item.unread_count > 0 ? "primaryText" : "secondaryText"}
                fontWeight={item.unread_count > 0 ? "500" : "normal"}
              >
                {item.last_message}
              </Text>

              {item.unread_count > 0 && (
                <Box
                  backgroundColor="primary"
                  borderRadius="full"
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  marginLeft="s"
                  minWidth={22}
                  height={22}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text variant="small" color="buttonText" fontWeight="bold">
                    {item.unread_count}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Card>
    </AnimatedPressable>
  )

  const renderEmptyComponent = () => (
    <Box padding="l" alignItems="center" justifyContent="center" flex={1} minHeight={300}>
      {loading ? (
        <Box width="100%" padding="m">
          {[1, 2, 3].map((i) => (
            <Box key={i} marginBottom="m">
              <Box flexDirection="row" alignItems="center">
                <Shimmer width={50} height={50} borderRadius={25} style={{ marginRight: 16 }} />
                <Box flex={1}>
                  <Shimmer width="60%" height={18} style={{ marginBottom: 8 }} />
                  <Shimmer width="90%" height={16} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <>
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
            Keine Konversationen vorhanden
          </Text>
          <Text variant="body" textAlign="center" color="secondaryText" marginBottom="l">
            Suche nach einem Kennzeichen, um eine Konversation zu starten.
          </Text>
          <Button
            title="Kennzeichen suchen"
            onPress={handleSearchPress}
            variant="primary"
            icon={<Search size={20} color={theme.colors.buttonText} />}
          />
        </>
      )}
    </Box>
  )

  const renderHeader = () => (
    <>
      {!isEmailVerified && <EmailVerificationBanner />}
      <Box padding="m" paddingBottom="s">
        <Text variant="title">Nachrichten</Text>
        <Text variant="caption" color="secondaryText">
          Kommuniziere mit anderen Fahrern
        </Text>
      </Box>
    </>
  )

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
          isTablet && styles.tabletListContent,
        ]}
        onRefresh={() => fetchConversations(true)}
        refreshing={refreshing}
      />
      <Box position="absolute" bottom={20} right={20}>
        <TouchableOpacity onPress={handleSearchPress}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabButton}
          >
            <Search size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  tabletListContent: {
    paddingHorizontal: 32,
    alignSelf: "center",
    maxWidth: 800,
    width: "100%",
  },
  conversationCard: {
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabletCard: {
    marginHorizontal: 0,
  },
  avatarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
})

export default ChatScreen
