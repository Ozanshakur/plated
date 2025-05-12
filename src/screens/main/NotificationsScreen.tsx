"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { FlatList, StyleSheet, Dimensions, SafeAreaView, Platform, StatusBar as RNStatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { Heart, MessageCircle, Mail, Bell, Check } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { usePolling } from "../../hooks/usePolling"
import EmailVerificationBanner from "../../components/EmailVerificationBanner"
import { StatusBar } from "expo-status-bar"
import Shimmer from "../../components/ui/Shimmer"
import AnimatedPressable from "../../components/ui/AnimatedPressable"

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

type Notification = {
  id: string
  type: "like" | "comment" | "message"
  created_at: string
  read: boolean
  sender_username: string
  post_content?: string
  message_content?: string
  sender_id: string
}

type FilterType = "all" | "unread" | "like" | "comment" | "message"

const { width } = Dimensions.get("window")
const isTablet = width >= 768
const STATUSBAR_HEIGHT = Platform.OS === "ios" ? 44 : RNStatusBar.currentHeight || 0

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>()
  const { user, isAuthenticated, isEmailVerified } = useAuth()
  const { theme, isDarkMode } = useTheme()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [hasUnread, setHasUnread] = useState(false)

  const fetchNotifications = async (showRefreshing = false) => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    if (showRefreshing) {
      setRefreshing(true)
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          created_at,
          read,
          sender_id,
          post_id,
          comment_id,
          message_id,
          profiles!sender_id(username)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Formatiere die Daten und hole zusätzliche Informationen
      const formattedNotifications = await Promise.all(
        data.map(async (notification: any) => {
          let postContent = ""
          let messageContent = ""

          // Extrahiere den Benutzernamen korrekt
          const profileData = notification.profiles || {}
          const senderUsername = typeof profileData === "object" ? profileData.username : "Unbekannter Benutzer"

          // Hole Post-Inhalt für Like- und Kommentar-Benachrichtigungen
          if (notification.post_id && (notification.type === "like" || notification.type === "comment")) {
            const { data: postData } = await supabase
              .from("posts")
              .select("content")
              .eq("id", notification.post_id)
              .single()

            if (postData) {
              postContent = postData.content || "Foto-Beitrag"
            }
          }

          // Hole Nachrichteninhalt für Nachrichten-Benachrichtigungen
          if (notification.message_id && notification.type === "message") {
            const { data: messageData } = await supabase
              .from("messages")
              .select("content")
              .eq("id", notification.message_id)
              .single()

            if (messageData) {
              messageContent = messageData.content
            }
          }

          return {
            id: notification.id,
            type: notification.type,
            created_at: notification.created_at,
            read: notification.read,
            sender_username: senderUsername,
            post_content: postContent,
            message_content: messageContent,
            sender_id: notification.sender_id,
          }
        }),
      )

      setNotifications(formattedNotifications)

      // Prüfe, ob es ungelesene Benachrichtigungen gibt
      const hasUnreadNotifications = formattedNotifications.some((notification) => !notification.read)
      setHasUnread(hasUnreadNotifications)

      // Wende den aktuellen Filter an
      applyFilter(activeFilter, formattedNotifications)
    } catch (error) {
      console.error("Fehler beim Laden der Benachrichtigungen:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const applyFilter = useCallback(
    (filter: FilterType, notificationsList = notifications) => {
      setActiveFilter(filter)

      let filtered = [...notificationsList]

      switch (filter) {
        case "unread":
          filtered = filtered.filter((notification) => !notification.read)
          break
        case "like":
          filtered = filtered.filter((notification) => notification.type === "like")
          break
        case "comment":
          filtered = filtered.filter((notification) => notification.type === "comment")
          break
        case "message":
          filtered = filtered.filter((notification) => notification.type === "message")
          break
        default:
          // "all" - keine Filterung notwendig
          break
      }

      setFilteredNotifications(filtered)
    },
    [notifications],
  )

  useEffect(() => {
    fetchNotifications()
  }, [isAuthenticated, user])

  useEffect(() => {
    applyFilter(activeFilter)
  }, [notifications, activeFilter, applyFilter])

  // Verwende den Polling-Hook, um regelmäßig nach neuen Benachrichtigungen zu suchen
  usePolling(
    async () => {
      if (isAuthenticated && user) {
        await fetchNotifications()
      }
    },
    7000, // Alle 7 Sekunden aktualisieren
    isAuthenticated, // Nur aktivieren, wenn der Benutzer angemeldet ist
  )

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      // Aktualisiere den lokalen State
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )
    } catch (error) {
      console.error("Fehler beim Markieren als gelesen:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return

    try {
      // Finde alle ungelesenen Benachrichtigungen
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

      if (unreadIds.length === 0) return

      // Aktualisiere in der Datenbank
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds)

      // Aktualisiere den lokalen State
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

      setHasUnread(false)
    } catch (error) {
      console.error("Fehler beim Markieren aller Benachrichtigungen als gelesen:", error)
    }
  }

  const handleNotificationPress = (notification: Notification) => {
    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail")
      return
    }

    markAsRead(notification.id)

    // Navigiere basierend auf dem Benachrichtigungstyp
    if (notification.type === "message") {
      navigation.navigate("Conversation", {
        userId: notification.sender_id,
        username: notification.sender_username,
      })
    }
    // Hier könnten weitere Navigationen für andere Benachrichtigungstypen hinzugefügt werden
  }

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={20} color={theme.colors.error} fill={theme.colors.error} />
      case "comment":
        return <MessageCircle size={20} color={theme.colors.primary} />
      case "message":
        return <Mail size={20} color={theme.colors.primary} />
      default:
        return null
    }
  }

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case "like":
        return `${notification.sender_username} hat deinen Beitrag "${
          notification.post_content
            ? notification.post_content.length > 30
              ? notification.post_content.substring(0, 30) + "..."
              : notification.post_content
            : "Foto-Beitrag"
        }" geliked.`
      case "comment":
        return `${notification.sender_username} hat deinen Beitrag "${
          notification.post_content
            ? notification.post_content.length > 30
              ? notification.post_content.substring(0, 30) + "..."
              : notification.post_content
            : "Foto-Beitrag"
        }" kommentiert.`
      case "message":
        return `${notification.sender_username} hat dir eine Nachricht gesendet: "${
          notification.message_content
            ? notification.message_content.length > 30
              ? notification.message_content.substring(0, 30) + "..."
              : notification.message_content
            : ""
        }"`
      default:
        return "Neue Benachrichtigung"
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
            <Bell size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="title" marginBottom="m" textAlign="center">
            Anmeldung erforderlich
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l" color="secondaryText">
            Du musst angemeldet sein, um deine Benachrichtigungen zu sehen.
          </Text>
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate("SignIn" as never)}
            variant="primary"
            size="large"
            fullWidth
          />
        </Box>
      </SafeAreaView>
    )
  }

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <AnimatedPressable onPress={() => handleNotificationPress(item)}>
      <Card
        variant={item.read ? "default" : "subtle"}
        padding="medium"
        style={[
          styles.notificationCard,
          isTablet && styles.tabletCard,
          !item.read && { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
        ]}
      >
        <Box flexDirection="row" alignItems="center" width="100%">
          <Box
            width={40}
            height={40}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginRight="m"
          >
            {renderNotificationIcon(item.type)}
          </Box>
          <Box flex={1}>
            <Text variant="body" fontWeight={!item.read ? "500" : "normal"} numberOfLines={2}>
              {getNotificationText(item)}
            </Text>
            <Text variant="small" color="secondaryText" marginTop="xs">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de })}
            </Text>
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
                <Shimmer width={40} height={40} borderRadius={20} style={{ marginRight: 16 }} />
                <Box flex={1}>
                  <Shimmer width="90%" height={18} style={{ marginBottom: 8 }} />
                  <Shimmer width="60%" height={14} />
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
            <Bell size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="subtitle" textAlign="center" marginBottom="m">
            Keine Benachrichtigungen
          </Text>
          <Text variant="body" textAlign="center" color="secondaryText">
            {activeFilter !== "all"
              ? `Keine ${activeFilter === "unread" ? "ungelesenen" : activeFilter === "like" ? "Like" : activeFilter === "comment" ? "Kommentar" : "Nachrichten"}-Benachrichtigungen gefunden.`
              : "Du hast keine Benachrichtigungen."}
          </Text>
        </>
      )}
    </Box>
  )

  const renderFilterChips = () => (
    <Box flexDirection="row" paddingHorizontal="m" paddingBottom="m" flexWrap="wrap">
      {[
        { label: "Alle", value: "all" as FilterType },
        { label: "Ungelesen", value: "unread" as FilterType },
        { label: "Likes", value: "like" as FilterType },
        { label: "Kommentare", value: "comment" as FilterType },
        { label: "Nachrichten", value: "message" as FilterType },
      ].map((filter) => (
        <AnimatedPressable key={filter.value} onPress={() => applyFilter(filter.value)}>
          <Box
            paddingHorizontal="m"
            paddingVertical="s"
            backgroundColor={activeFilter === filter.value ? "primary" : "cardBackground"}
            borderRadius="m"
            marginRight="s"
            marginBottom="s"
          >
            <Text variant="caption" color={activeFilter === filter.value ? "cardBackground" : "primaryText"}>
              {filter.label}
            </Text>
          </Box>
        </AnimatedPressable>
      ))}
    </Box>
  )

  const renderHeader = () => (
    <>
      {!isEmailVerified && <EmailVerificationBanner />}
      <Box style={{ paddingTop: STATUSBAR_HEIGHT + 16 }} paddingHorizontal="m" paddingBottom="s">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
          <Text variant="title">Aktivitäten</Text>
          {hasUnread && (
            <Box flexDirection="row" alignItems="center">
              <Button title="Alle gelesen" onPress={markAllAsRead} variant="outline" size="small" />
              <Check size={16} color={theme.colors.primary} style={{ marginLeft: -24, marginRight: 8 }} />
            </Box>
          )}
        </Box>
        <Text variant="caption" color="secondaryText" marginBottom="m">
          Deine Benachrichtigungen und Updates
        </Text>
        {renderFilterChips()}
      </Box>
    </>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          filteredNotifications.length === 0 && styles.emptyListContent,
          isTablet && styles.tabletListContent,
        ]}
        onRefresh={() => fetchNotifications(true)}
        refreshing={refreshing}
        style={{ width: "100%" }}
      />
    </SafeAreaView>
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
  notificationCard: {
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: "100%",
  },
  tabletCard: {
    marginHorizontal: 0,
  },
})

export default NotificationsScreen
