"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  Alert as RNAlert,
} from "react-native"
import { useNavigation, CommonActions } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../theme/ThemeProvider"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import PostCard from "../../components/PostCard"
import AuthHeader from "../../components/AuthHeader"
import DashboardSection from "../../components/DashboardSection"
import FeaturedPost from "../../components/FeaturedPost"
import EmailVerificationBanner from "../../components/EmailVerificationBanner"
import { usePolling } from "../../hooks/usePolling"
import { Plus, Search, Bell, MessageCircle } from "lucide-react-native"
import ImageViewer from "../../components/ImageViewer"

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

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

const { width } = Dimensions.get("window")

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>()
  const { user, isAuthenticated, isEmailVerified } = useAuth()
  const { theme } = useTheme()
  const scrollViewRef = useRef<ScrollView>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  // Add state for the image viewer
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)

  // Funktion zum Navigieren zu einem Tab innerhalb des MainTabNavigator
  const navigateToTab = (tabName: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Main",
        params: { screen: tabName },
      }),
    )
  }

  // Funktion zum Mischen eines Arrays (Fisher-Yates Shuffle)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  // Korrigiere die Supabase-Abfrage und Objektzugriffe
  const fetchPosts = async () => {
    try {
      setLoading(true)

      // Vereinfachte Abfrage ohne komplexe Unterabfragen
      const { data, error } = await supabase
        .from("posts")
        .select(`
    id,
    user_id,
    content,
    image_url,
    image_base64,
    created_at,
    profiles(username, license_plate, verification_status)
  `)
        .order("created_at", { ascending: false })
        .range(0, 9)

      if (error) {
        console.error("Fehler beim Laden der Posts:", error)
        return
      }

      // Hole Likes und Kommentare separat
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
          let userHasLiked = false
          if (isAuthenticated && user) {
            const { data: likeData } = await supabase
              .from("likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .single()

            userHasLiked = !!likeData
          }

          // Extrahiere die Profilinformationen korrekt
          const profileData = post.profiles || {}
          const username = typeof profileData === "object" ? profileData.username : "Unbekannter Benutzer"
          const licensePlate = typeof profileData === "object" ? profileData.license_plate : ""
          const verificationStatus = typeof profileData === "object" ? profileData.verification_status : "not_verified"

          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            image_url: post.image_url,
            image_base64: post.image_base64,
            created_at: post.created_at,
            username: username,
            license_plate: licensePlate,
            verification_status: verificationStatus,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: userHasLiked,
          }
        }),
      )

      // Setze alle Posts
      setPosts(postsWithCounts)

      // Für die Featured Posts:
      // 1. Sammle Posts mit Bildern
      const postsWithImages = postsWithCounts.filter((post) => post.image_url)

      // 2. Sammle Posts mit den meisten Likes
      const sortedByLikes = [...postsWithCounts].sort((a, b) => b.likes_count - a.likes_count)

      // 3. Kombiniere und entferne Duplikate
      let combinedPosts = [...postsWithImages, ...sortedByLikes.slice(0, 3)].filter(
        (post, index, self) => index === self.findIndex((p) => p.id === post.id),
      )

      // 4. Füge zufällige Posts hinzu, wenn nicht genug vorhanden sind
      if (combinedPosts.length < 5 && postsWithCounts.length > 0) {
        const randomPosts = shuffleArray(postsWithCounts)
          .filter((post) => !combinedPosts.some((p) => p.id === post.id))
          .slice(0, 5 - combinedPosts.length)

        combinedPosts = [...combinedPosts, ...randomPosts]
      }

      // 5. Mische die Posts für eine zufällige Reihenfolge
      const featured = shuffleArray(combinedPosts).slice(0, 5)

      setFeaturedPosts(featured)
    } catch (error) {
      console.error("Fehler:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Add a function to handle image press
  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setImageViewerVisible(true)
  }

  const checkUnreadNotifications = async () => {
    if (!isAuthenticated || !user) return

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) throw error

      setHasUnreadNotifications(count !== null && count > 0)
    } catch (error) {
      console.error("Fehler beim Prüfen ungelesener Benachrichtigungen:", error)
    }
  }

  useEffect(() => {
    fetchPosts()
    checkUnreadNotifications()
  }, [isAuthenticated])

  // Verwende den Polling-Hook, um regelmäßig nach neuen Posts zu suchen
  usePolling(
    async () => {
      await fetchPosts()
    },
    10000, // Alle 10 Sekunden aktualisieren
    true, // Immer aktivieren, unabhängig vom Authentifizierungsstatus
  )

  usePolling(
    async () => {
      if (isAuthenticated && user) {
        await checkUnreadNotifications()
      }
    },
    5000, // Alle 5 Sekunden prüfen
    isAuthenticated, // Nur aktivieren, wenn der Benutzer angemeldet ist
  )

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPosts()
  }

  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated) {
      navigation.navigate("SignIn")
      return
    }

    // Überprüfe, ob die E-Mail bestätigt wurde
    if (!isEmailVerified) {
      RNAlert.alert(
        "E-Mail-Bestätigung erforderlich",
        "Bitte bestätige deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
      )
      return
    }

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
      const updatePosts = (prevPosts: Post[]) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
              user_has_liked: !p.user_has_liked,
            }
          }
          return p
        })

      setPosts(updatePosts)
      setFeaturedPosts(updatePosts)
    } catch (error) {
      console.error("Fehler beim Liken/Unliken:", error)
    }
  }

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: theme.colors.primaryLight }]}
        onPress={() => navigateToTab("Search")}
      >
        <Search size={20} color={theme.colors.primary} />
        <Text variant="small" style={{ color: theme.colors.primary, marginTop: 4 }}>
          Suchen
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: theme.colors.primaryLight }]}
        onPress={() => {
          if (!isAuthenticated) {
            navigation.navigate("SignIn")
            return
          }

          if (!isEmailVerified) {
            RNAlert.alert(
              "E-Mail-Bestätigung erforderlich",
              "Bitte bestätige deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
            )
            return
          }

          navigateToTab("CreatePost")
        }}
      >
        <Plus size={20} color={theme.colors.primary} />
        <Text variant="small" style={{ color: theme.colors.primary, marginTop: 4 }}>
          Posten
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: theme.colors.primaryLight }]}
        onPress={() => navigateToTab("Notifications")}
      >
        <View>
          <Bell size={20} color={theme.colors.primary} />
          {hasUnreadNotifications && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.colors.error,
              }}
            />
          )}
        </View>
        <Text variant="small" style={{ color: theme.colors.primary, marginTop: 4 }}>
          Aktivität
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: theme.colors.primaryLight }]}
        onPress={() => {
          if (!isAuthenticated) {
            navigation.navigate("SignIn")
            return
          }

          if (!isEmailVerified) {
            RNAlert.alert(
              "E-Mail-Bestätigung erforderlich",
              "Bitte bestätige deine E-Mail-Adresse, um diese Funktion nutzen zu können.",
            )
            return
          }

          navigation.navigate("Chat")
        }}
      >
        <MessageCircle size={20} color={theme.colors.primary} />
        <Text variant="small" style={{ color: theme.colors.primary, marginTop: 4 }}>
          Chats
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderFeaturedPosts = () => (
    <DashboardSection
      title="Entdecken"
      action={
        <TouchableOpacity onPress={() => scrollViewRef.current?.scrollTo({ y: 400, animated: true })}>
          <Text variant="small" style={{ color: theme.colors.primary }}>
            Alle anzeigen
          </Text>
        </TouchableOpacity>
      }
    >
      <FlatList
        horizontal
        data={featuredPosts}
        keyExtractor={(item) => `featured-${item.id}`}
        renderItem={({ item }) => (
          <FeaturedPost
            post={item}
            onPress={() => {
              /* Zum Post navigieren */
            }}
            onLike={() => handleLikePost(item.id)}
            onImagePress={() => item.image_url && handleImagePress(item.image_url)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredPostsContainer}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        ListEmptyComponent={
          loading ? (
            <Card variant="outlined" style={styles.emptyFeaturedCard}>
              <Text variant="caption" color="secondaryText">
                Lade Posts...
              </Text>
            </Card>
          ) : (
            <Card variant="outlined" style={styles.emptyFeaturedCard}>
              <Text variant="caption" color="secondaryText">
                Keine Posts gefunden
              </Text>
            </Card>
          )
        }
      />
    </DashboardSection>
  )

  const renderWelcomeCard = () => {
    if (isAuthenticated) return null

    return (
      <View style={styles.welcomeCardContainer}>
        <Card variant="elevated" style={styles.welcomeCard}>
          <Text variant="subtitle" style={styles.welcomeTitle}>
            Willkommen bei Plated
          </Text>
          <Text variant="body" style={styles.welcomeText}>
            Verbinde dich mit anderen Autofahrern, teile deine Erfahrungen und finde neue Kontakte.
          </Text>
          <View style={styles.welcomeButtons}>
            <Button
              title="Registrieren"
              onPress={() => navigation.navigate("SignUp")}
              variant="gradient"
              size="medium"
              style={{ marginRight: 12 }}
            />
            <Button title="Anmelden" onPress={() => navigation.navigate("SignIn")} variant="outline" size="medium" />
          </View>
        </Card>
      </View>
    )
  }

  const renderAllPosts = () => (
    <DashboardSection title="Neueste Posts">
      {posts.length === 0 && !loading ? (
        <Card variant="subtle" style={styles.emptyCard}>
          <View style={styles.emptyCardContent}>
            <Text variant="body" textAlign="center" color="secondaryText">
              Keine Posts gefunden. Sei der Erste, der etwas teilt!
            </Text>
            {!isAuthenticated && (
              <Button
                title="Anmelden zum Posten"
                onPress={() => navigation.navigate("SignIn")}
                variant="gradient"
                size="medium"
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        </Card>
      ) : (
        <View style={styles.allPostsContainer}>
          {posts.map((post) => (
            <PostCard
              key={`all-${post.id}`}
              post={post}
              onLike={() => handleLikePost(post.id)}
              onImagePress={() => post.image_url && handleImagePress(post.image_url)}
            />
          ))}
        </View>
      )}
    </DashboardSection>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <AuthHeader />

      {isAuthenticated && <EmailVerificationBanner />}

      <ScrollView
        ref={scrollViewRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderWelcomeCard()}
        {renderQuickActions()}
        {renderFeaturedPosts()}
        {renderAllPosts()}
      </ScrollView>
      {selectedImage && (
        <ImageViewer
          visible={imageViewerVisible}
          imageUri={selectedImage}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeCardContainer: {
    paddingHorizontal: 16,
    width: "100%",
  },
  welcomeCard: {
    marginTop: 16,
    marginBottom: 8,
    width: "100%",
  },
  welcomeTitle: {
    marginBottom: 8,
  },
  welcomeText: {
    marginBottom: 16,
  },
  welcomeButtons: {
    flexDirection: "row",
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  quickActionButton: {
    width: (width - 48) / 4,
    height: 70,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  featuredPostsContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  emptyFeaturedCard: {
    width: width * 0.8,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 0,
    width: width - 32, // Volle Breite minus Margins
    alignSelf: "center",
  },
  emptyCardContent: {
    padding: 24,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  allPostsContainer: {
    gap: 24, // Erhöhter Abstand zwischen den Posts
    paddingTop: 8,
    paddingBottom: 16,
  },
})

export default HomeScreen
