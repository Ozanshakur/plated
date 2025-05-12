"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  View,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import PostCard from "../../components/PostCard"
import {
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  Shield,
  Info,
  ChevronRight,
  HelpCircle,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { areNotificationsEnabled, toggleNotifications } from "../../lib/notification-service"
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import VerificationBadge from "../../components/VerificationBadge"

const { width } = Dimensions.get("window")
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0

type UserProfile = {
  username: string
  license_plate: string
  bio: string | null
  avatar_url: string | null
  verification_status: "not_verified" | "pending" | "verified" | "rejected"
}

type Post = {
  id: string
  user_id: string
  content: string
  image_url: string
  created_at: string
  username: string
  license_plate: string
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

// Define types for our data
type Profile = {
  id: string
  username: string
  license_plate: string
  bio: string | null
  avatar_url: string | null
  [key: string]: any
}

type PostData = {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  [key: string]: any
}

type Comment = {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  [key: string]: any
}

type Like = {
  id: string
  user_id: string
  post_id: string
  created_at: string
  posts?: any
  [key: string]: any
}

type Conversation = {
  id: string
  created_at: string
  conversations?: any
  [key: string]: any
}

type Message = {
  id: string
  user_id: string
  conversation_id: string
  content: string
  created_at: string
  [key: string]: any
}

type UserData = {
  profile: Profile | null
  posts: PostData[]
  comments: Comment[]
  likes: Like[]
  conversations: Conversation[]
  messages: Message[]
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation()
  const { user, signOut, isAuthenticated } = useAuth()
  const { theme, isDarkMode, toggleTheme } = useTheme()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const deleteConfirmationInputRef = useRef("")

  const fetchProfile = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("profiles")
        .select("username, license_plate, bio, avatar_url, verification_status")
        .eq("id", user.id)
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error("Fehler beim Laden des Profils:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    if (!isAuthenticated || !user) {
      setPostsLoading(false)
      return
    }

    try {
      setPostsLoading(true)

      const { data, error } = await supabase
        .from("posts")
        .select(`
        id,
        user_id,
        content,
        image_url,
        created_at,
        profiles(username, license_plate)
      `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Hole Likes und Kommentare für jeden Post
      const postsWithCounts = await Promise.all(
        data.map(async (post: any) => {
          // Likes zählen
          const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          // Kommentare zählen
          const { count: commentsCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          // Prüfe, ob der aktuelle Benutzer den Post geliked hat
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .single()

          // Extrahiere die Profilinformationen korrekt
          const profileData = post.profiles || {}
          const username = typeof profileData === "object" ? profileData.username : "Unbekannter Benutzer"
          const licensePlate = typeof profileData === "object" ? profileData.license_plate : ""

          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            image_url: post.image_url,
            created_at: post.created_at,
            username: username,
            license_plate: licensePlate,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: !!likeData,
          }
        }),
      )

      setPosts(postsWithCounts)
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error)
    } finally {
      setPostsLoading(false)
    }
  }

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value)
    await toggleNotifications(value)
  }

  // Lade Daten beim ersten Rendern und wenn der Screen fokussiert wird
  useFocusEffect(
    useCallback(() => {
      fetchProfile()
      fetchUserPosts()

      const loadNotificationSettings = async () => {
        const enabled = await areNotificationsEnabled()
        setNotificationsEnabled(enabled)
      }

      loadNotificationSettings()
    }, [isAuthenticated, user]),
  )

  const handleSignOut = async () => {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden",
        onPress: async () => {
          await signOut()
          navigation.navigate("Welcome" as never)
        },
      },
    ])
  }

  const handleLikePost = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId)

      if (post?.user_has_liked) {
        // Unlike
        await supabase.from("likes").delete().match({ user_id: user?.id, post_id: postId })
      } else {
        // Like
        await supabase.from("likes").insert({
          user_id: user?.id,
          post_id: postId,
        })
      }

      // Aktualisiere den Post in der lokalen State
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
              user_has_liked: !p.user_has_liked,
            }
          }
          return p
        }),
      )
    } catch (error) {
      console.error("Fehler beim Liken/Unliken:", error)
    }
  }

  const navigateToEditProfile = () => {
    navigation.navigate("EditProfile" as never)
  }

  const navigateToPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy" as never)
  }

  const navigateToSupport = () => {
    navigation.navigate("Support" as never)
  }

  // Neue Funktion: Datenauskunft
  const handleDataExport = async () => {
    if (!user) return

    try {
      setIsExportingData(true)

      // Sammle alle Benutzerdaten
      const userData: UserData = {
        profile: null,
        posts: [],
        comments: [],
        likes: [],
        conversations: [],
        messages: [],
      }

      // Profildaten abrufen
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError
      userData.profile = profileData

      // Posts abrufen
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (postsError) throw postsError
      userData.posts = postsData || []

      // Kommentare abrufen
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (commentsError) throw commentsError
      userData.comments = commentsData || []

      // Likes abrufen
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("*, posts(content)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (likesError) throw likesError
      userData.likes = likesData || []

      // Konversationen abrufen
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversation_participants")
        .select("*, conversations(*)")
        .eq("user_id", user.id)

      if (conversationsError) throw conversationsError
      userData.conversations = conversationsData || []

      // Nachrichten abrufen
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (messagesError) throw messagesError
      userData.messages = messagesData || []

      // Daten als JSON-Datei speichern
      const jsonData = JSON.stringify(userData, null, 2)
      const fileName = `plated_data_export_${new Date().toISOString().split("T")[0]}.json`
      const filePath = `${FileSystem.documentDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, jsonData)

      // Datei teilen
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "Deine Plated-Daten",
        })
      } else {
        // Fallback für Geräte ohne Sharing-Funktion
        Alert.alert(
          "Teilen nicht verfügbar",
          "Das Teilen von Dateien wird auf diesem Gerät nicht unterstützt. Die Datei wurde unter " +
            filePath +
            " gespeichert.",
        )
      }
    } catch (error) {
      console.error("Fehler beim Exportieren der Daten:", error)
      Alert.alert(
        "Fehler",
        "Beim Exportieren deiner Daten ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
      )
    } finally {
      setIsExportingData(false)
    }
  }

  // Neue Funktion: Account löschen
  const handleDeleteAccount = () => {
    Alert.alert(
      "Account löschen",
      "Möchtest du deinen Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Bestätigung",
              'Bitte gib "LÖSCHEN" ein, um zu bestätigen, dass du deinen Account unwiderruflich löschen möchtest.',
              [
                { text: "Abbrechen", style: "cancel" },
                {
                  text: "Bestätigen",
                  style: "destructive",
                  onPress: async (input) => {
                    if (input === "LÖSCHEN") {
                      await deleteAccount()
                    } else {
                      Alert.alert("Fehler", 'Bitte gib genau "LÖSCHEN" ein, um fortzufahren.')
                    }
                  },
                },
              ],
              "plain-text",
            )
          },
        },
      ],
    )
  }

  const deleteAccount = async () => {
    if (!user) return

    try {
      setIsDeletingAccount(true)

      // 1. Lösche alle Benutzerdaten
      // Lösche Likes
      const { error: likesError } = await supabase.from("likes").delete().eq("user_id", user.id)
      if (likesError) throw likesError

      // Lösche Kommentare
      const { error: commentsError } = await supabase.from("comments").delete().eq("user_id", user.id)
      if (commentsError) throw commentsError

      // Lösche Nachrichten
      const { error: messagesError } = await supabase.from("messages").delete().eq("user_id", user.id)
      if (messagesError) throw messagesError

      // Lösche Konversationsteilnahmen
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("user_id", user.id)
      if (participantsError) throw participantsError

      // Lösche Posts
      const { error: postsError } = await supabase.from("posts").delete().eq("user_id", user.id)
      if (postsError) throw postsError

      // Lösche Benachrichtigungen
      const { error: notificationsError } = await supabase.from("notifications").delete().eq("user_id", user.id)
      if (notificationsError) throw notificationsError

      // Lösche Profil
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id)
      if (profileError) throw profileError

      // 2. Lösche den Benutzer aus der Auth-Tabelle
      const { error: authError } = await supabase.rpc("delete_user")
      if (authError) throw authError

      // 3. Abmelden und zur Welcome-Seite navigieren
      await signOut()
      Alert.alert("Account gelöscht", "Dein Account wurde erfolgreich gelöscht.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Welcome" as never),
        },
      ])
    } catch (error) {
      console.error("Fehler beim Löschen des Accounts:", error)
      Alert.alert(
        "Fehler",
        "Beim Löschen deines Accounts ist ein Fehler aufgetreten. Bitte versuche es später erneut oder kontaktiere den Support.",
      )
    } finally {
      setIsDeletingAccount(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <Box flex={1} backgroundColor="mainBackground" padding="l" justifyContent="center" alignItems="center">
          <Text variant="title" marginBottom="m">
            Anmeldung erforderlich
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l">
            Du musst angemeldet sein, um dein Profil zu sehen.
          </Text>
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate("SignIn" as never)}
            variant="primary"
            size="large"
          />
        </Box>
      </SafeAreaView>
    )
  }

  const renderSettingsScreen = () => {
    return (
      <Box flex={1} backgroundColor="mainBackground">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="m"
          style={{ paddingTop: Platform.OS === "ios" ? 10 : STATUSBAR_HEIGHT + 10, paddingBottom: 10 }}
          backgroundColor="cardBackground"
        >
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text variant="subtitle" color="primary">
              Zurück
            </Text>
          </TouchableOpacity>
          <Text variant="subtitle" fontWeight="bold">
            Einstellungen
          </Text>
          <Box width={50} />
        </Box>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Box padding="m">
            <Card variant="outlined" style={styles.settingsCard}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Konto
              </Text>

              <TouchableOpacity style={styles.settingRow} onPress={navigateToEditProfile}>
                <Box flexDirection="row" alignItems="center">
                  <User size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Profil bearbeiten
                  </Text>
                </Box>
                <ChevronRight size={18} color={theme.colors.secondaryText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate("Verification" as never)}>
                <Box flexDirection="row" alignItems="center">
                  <Shield size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Verifizierung
                  </Text>
                </Box>
                <Box flexDirection="row" alignItems="center">
                  <VerificationBadge
                    status={profile?.verification_status || "not_verified"}
                    size="small"
                    showText={true}
                  />
                  <ChevronRight size={18} color={theme.colors.secondaryText} style={{ marginLeft: 8 }} />
                </Box>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={navigateToPrivacyPolicy}>
                <Box flexDirection="row" alignItems="center">
                  <Shield size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Datenschutz
                  </Text>
                </Box>
                <ChevronRight size={18} color={theme.colors.secondaryText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={handleDataExport}>
                <Box flexDirection="row" alignItems="center">
                  <Download size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Datenauskunft anfordern
                  </Text>
                </Box>
                {isExportingData ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <ChevronRight size={18} color={theme.colors.secondaryText} />
                )}
              </TouchableOpacity>
            </Card>

            <Card variant="outlined" style={styles.settingsCard}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Benachrichtigungen
              </Text>

              <View style={styles.settingRow}>
                <Box flexDirection="row" alignItems="center">
                  <Bell size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Push-Benachrichtigungen
                  </Text>
                </Box>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === "ios" ? undefined : theme.colors.cardBackground}
                />
              </View>
            </Card>

            <Card variant="outlined" style={styles.settingsCard}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Darstellung
              </Text>

              <View style={styles.settingRow}>
                <Box flexDirection="row" alignItems="center">
                  {isDarkMode ? (
                    <Moon size={20} color={theme.colors.primary} />
                  ) : (
                    <Sun size={20} color={theme.colors.primary} />
                  )}
                  <Text variant="body" marginLeft="s">
                    Dark Mode
                  </Text>
                </Box>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={Platform.OS === "ios" ? undefined : theme.colors.cardBackground}
                />
              </View>
            </Card>

            <Card variant="outlined" style={styles.settingsCard}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Hilfe
              </Text>

              <TouchableOpacity style={styles.settingRow} onPress={navigateToSupport}>
                <Box flexDirection="row" alignItems="center">
                  <HelpCircle size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    Support & FAQ
                  </Text>
                </Box>
                <ChevronRight size={18} color={theme.colors.secondaryText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert("Info", "App-Version: 1.0.0")}>
                <Box flexDirection="row" alignItems="center">
                  <Info size={20} color={theme.colors.primary} />
                  <Text variant="body" marginLeft="s">
                    App-Version
                  </Text>
                </Box>
                <Text variant="body" color="secondaryText">
                  1.0.0
                </Text>
              </TouchableOpacity>
            </Card>

            <Card variant="outlined" style={[styles.settingsCard, { borderColor: theme.colors.error }]}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m" color="error">
                Gefahrenzone
              </Text>

              <TouchableOpacity
                style={[styles.settingRow, { borderBottomWidth: 0 }]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Box flexDirection="row" alignItems="center">
                  <Trash2 size={20} color={theme.colors.error} />
                  <Text variant="body" marginLeft="s" color="error">
                    Account löschen
                  </Text>
                </Box>
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <ChevronRight size={18} color={theme.colors.error} />
                )}
              </TouchableOpacity>
            </Card>

            <Button title="Abmelden" onPress={handleSignOut} variant="primary" size="large" style={{ marginTop: 20 }} />
          </Box>
        </ScrollView>
      </Box>
    )
  }

  const renderProfileScreen = () => {
    return (
      <Box flex={1} backgroundColor="mainBackground">
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Box padding="m">
            <Card variant="elevated" style={styles.profileCard}>
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
                  <User size={40} color={theme.colors.primary} />
                </Box>

                {profile ? (
                  <>
                    <Box flexDirection="row" alignItems="center">
                      <Text variant="title">{profile.username}</Text>
                      <Box marginLeft="xs">
                        <VerificationBadge status={profile.verification_status || "not_verified"} size="medium" />
                      </Box>
                    </Box>
                    <Text variant="subtitle" color="secondaryText" marginTop="xs">
                      {profile.license_plate}
                    </Text>
                    {profile.bio && (
                      <Text variant="body" textAlign="center" marginTop="m">
                        {profile.bio}
                      </Text>
                    )}
                  </>
                ) : loading ? (
                  <Text variant="body">Lade Profil...</Text>
                ) : (
                  <Text variant="body">Profil konnte nicht geladen werden</Text>
                )}
              </Box>

              <Box flexDirection="row" justifyContent="space-around" marginTop="m">
                <TouchableOpacity style={styles.profileAction} onPress={navigateToEditProfile}>
                  <User size={24} color={theme.colors.primary} />
                  <Text variant="caption" color="primary" marginTop="xs">
                    Bearbeiten
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileAction} onPress={() => setShowSettings(true)}>
                  <Settings size={24} color={theme.colors.primary} />
                  <Text variant="caption" color="primary" marginTop="xs">
                    Einstellungen
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileAction} onPress={handleSignOut}>
                  <LogOut size={24} color={theme.colors.primary} />
                  <Text variant="caption" color="primary" marginTop="xs">
                    Abmelden
                  </Text>
                </TouchableOpacity>
              </Box>
            </Card>

            {profile && profile.verification_status === "not_verified" && (
              <Card
                variant="outlined"
                style={[styles.warningCard, { borderColor: theme.colors.warning, marginBottom: 16 }]}
              >
                <Box flexDirection="row" alignItems="center">
                  <AlertTriangle size={20} color={theme.colors.warning} />
                  <Box flex={1} marginLeft="s">
                    <Text variant="body" color="warning">
                      Dein Konto ist noch nicht verifiziert. Bitte verifiziere dein Konto innerhalb von 7 Tagen, um alle
                      Funktionen nutzen zu können.
                    </Text>
                    <TouchableOpacity
                      style={{ marginTop: 8 }}
                      onPress={() => navigation.navigate("Verification" as never)}
                    >
                      <Text variant="body" color="primary">
                        Jetzt verifizieren
                      </Text>
                    </TouchableOpacity>
                  </Box>
                </Box>
              </Card>
            )}

            <Box marginTop="l">
              <Text variant="title" marginBottom="m">
                Meine Beiträge
              </Text>

              {postsLoading ? (
                <Box alignItems="center" justifyContent="center" padding="l">
                  <Text variant="body" textAlign="center">
                    Lade Beiträge...
                  </Text>
                </Box>
              ) : posts.length === 0 ? (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  padding="l"
                  backgroundColor="surfaceBackground"
                  borderRadius="m"
                >
                  <Text variant="body" textAlign="center" color="secondaryText">
                    Du hast noch keine Beiträge erstellt.
                  </Text>
                  <Button
                    title="Beitrag erstellen"
                    onPress={() => navigation.navigate("CreatePost" as never)}
                    variant="primary"
                    size="medium"
                    style={{ marginTop: 16 }}
                  />
                </Box>
              ) : (
                <Box width="100%">
                  {posts.map((post) => (
                    <Box key={post.id} width="100%" marginBottom="m">
                      <PostCard post={post} onLike={() => handleLikePost(post.id)} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </ScrollView>
      </Box>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      {showSettings ? renderSettingsScreen() : renderProfileScreen()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  profileCard: {
    padding: 16,
    width: "100%",
  },
  settingsCard: {
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  profileAction: {
    alignItems: "center",
    padding: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  warningCard: {
    padding: 12,
  },
})

export default ProfileScreen
