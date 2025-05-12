"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, View } from "react-native"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import PostCard from "../../components/PostCard"
import { User, MessageCircle, ArrowLeft, Flag, Car } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { SafeAreaView } from "react-native-safe-area-context"
import ReportPostModal from "../../components/ReportPostModal"

type UserProfileScreenRouteProp = RouteProp<RootStackParamList, "UserProfile">
type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

type UserProfile = {
  id: string
  username: string
  license_plate: string
  bio: string | null
  avatar_url: string | null
}

type AdditionalLicensePlate = {
  id: string
  user_id: string
  license_plate: string
}

type Post = {
  id: string
  user_id: string
  content: string
  image_url: string | null
  image_base64: string | null
  created_at: string
  username: string
  license_plate: string
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

const { width } = Dimensions.get("window")

const UserProfileScreen: React.FC = () => {
  const route = useRoute<UserProfileScreenRouteProp>()
  const navigation = useNavigation<UserProfileScreenNavigationProp>()
  const { user, isAuthenticated, isEmailVerified } = useAuth()
  const { theme } = useTheme()

  const { userId } = route.params
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [additionalLicensePlates, setAdditionalLicensePlates] = useState<AdditionalLicensePlate[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [licensePlatesLoading, setLicensePlatesLoading] = useState(true)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      setIsCurrentUser(user.id === userId)
    }

    fetchProfile()
    fetchAdditionalLicensePlates()
    fetchUserPosts()
  }, [userId, isAuthenticated, user])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, license_plate, bio, avatar_url")
        .eq("id", userId)
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error("Fehler beim Laden des Profils:", error)
      Alert.alert("Fehler", "Das Profil konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAdditionalLicensePlates = async () => {
    try {
      setLicensePlatesLoading(true)

      const { data, error } = await supabase
        .from("additional_license_plates")
        .select("id, user_id, license_plate")
        .eq("user_id", userId)

      if (error) {
        throw error
      }

      setAdditionalLicensePlates(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der zusätzlichen Kennzeichen:", error)
    } finally {
      setLicensePlatesLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true)

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          content,
          image_url,
          image_base64,
          created_at
        `)
        .eq("user_id", userId)
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

          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            image_url: post.image_url || undefined,
            image_base64: post.image_base64 || undefined,
            created_at: post.created_at,
            username: profile?.username || "",
            license_plate: profile?.license_plate || "",
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: userHasLiked,
          }
        }),
      )

      setPosts(postsWithCounts)
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error)
      Alert.alert("Fehler", "Die Beiträge konnten nicht geladen werden.")
    } finally {
      setPostsLoading(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated) {
      navigation.navigate("SignIn")
      return
    }

    if (!isEmailVerified) {
      Alert.alert(
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

  const handleMessage = () => {
    if (!isAuthenticated) {
      Alert.alert("Anmeldung erforderlich", "Du musst angemeldet sein, um Nachrichten zu senden.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Anmelden", onPress: () => navigation.navigate("SignIn") },
      ])
      return
    }

    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail")
      return
    }

    if (!profile) return

    navigation.navigate("Conversation", {
      userId: profile.id,
      username: profile.username,
    })
  }

  const handleReportUser = () => {
    setReportModalVisible(true)
  }

  const handleCreatePost = () => {
    // Check if CreatePost is in the navigation stack
    // If not, navigate to the appropriate screen
    navigation.navigate("Main")
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" marginTop="m">
            Lade Profil...
          </Text>
        </Box>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <Box flex={1} justifyContent="center" alignItems="center" padding="l">
          <Text variant="title" marginBottom="m">
            Profil nicht gefunden
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l">
            Das gesuchte Profil konnte nicht gefunden werden oder existiert nicht mehr.
          </Text>
          <Button title="Zurück" onPress={() => navigation.goBack()} variant="primary" size="medium" />
        </Box>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="m"
        paddingVertical="s"
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <Text variant="subtitle" fontWeight="bold">
          Profil
        </Text>
        <Box width={24} />
      </Box>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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

              <Text variant="title">{profile.username}</Text>

              {/* License Plates Section */}
              <Box marginTop="m" width="100%">
                <Box flexDirection="row" alignItems="center" justifyContent="center" marginBottom="s">
                  <Car size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text variant="subtitle" fontWeight="bold">
                    Kennzeichen
                  </Text>
                </Box>

                {/* Primary License Plate */}
                <View style={styles.licensePlateContainer}>
                  <Text
                    style={[
                      styles.licensePlate,
                      { backgroundColor: theme.colors.primaryLight, color: theme.colors.primary },
                    ]}
                  >
                    {profile.license_plate}
                  </Text>
                </View>

                {/* Additional License Plates */}
                {licensePlatesLoading ? (
                  <Box alignItems="center" justifyContent="center" padding="s">
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </Box>
                ) : additionalLicensePlates.length > 0 ? (
                  <View style={styles.additionalPlatesContainer}>
                    {additionalLicensePlates.map((plate) => (
                      <Text
                        key={plate.id}
                        style={[
                          styles.licensePlate,
                          { backgroundColor: theme.colors.surfaceBackground, color: theme.colors.secondaryText },
                        ]}
                      >
                        {plate.license_plate}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text variant="small" color="secondaryText" textAlign="center" marginTop="xs">
                    Keine weiteren Kennzeichen
                  </Text>
                )}
              </Box>

              {profile.bio && (
                <Box marginTop="m" width="100%">
                  <Text variant="subtitle" fontWeight="bold" marginBottom="xs" textAlign="center">
                    Über {profile.username}:
                  </Text>
                  <Text variant="body" textAlign="center">
                    {profile.bio}
                  </Text>
                </Box>
              )}
            </Box>

            {!isCurrentUser && (
              <Box flexDirection="row" justifyContent="center" marginTop="m">
                <Button
                  title="Nachricht senden"
                  onPress={handleMessage}
                  variant="primary"
                  size="medium"
                  icon={<MessageCircle size={18} color={theme.colors.buttonText} />}
                  style={{ marginRight: 12 }}
                />
                <Button
                  title="Melden"
                  onPress={handleReportUser}
                  variant="outline"
                  size="medium"
                  icon={<Flag size={18} color={theme.colors.error} />}
                  style={{ borderColor: theme.colors.error }}
                />
              </Box>
            )}
          </Card>

          <Box marginTop="l">
            <Text variant="title" marginBottom="m">
              Beiträge von {profile.username}
            </Text>

            {postsLoading ? (
              <Box alignItems="center" justifyContent="center" padding="l">
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="body" textAlign="center" marginTop="m">
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
                  {isCurrentUser
                    ? "Du hast noch keine Beiträge erstellt."
                    : `${profile.username} hat noch keine Beiträge erstellt.`}
                </Text>
                {isCurrentUser && (
                  <Button
                    title="Beitrag erstellen"
                    onPress={handleCreatePost}
                    variant="primary"
                    size="medium"
                    style={{ marginTop: 16 }}
                  />
                )}
              </Box>
            ) : (
              <Box width="100%">
                {posts.map((post) => {
                  // Create a new object with the correct types for PostCard
                  const postCardProps = {
                    id: post.id,
                    user_id: post.user_id,
                    username: post.username,
                    license_plate: post.license_plate,
                    content: post.content,
                    image_url: post.image_url === null ? undefined : post.image_url,
                    image_base64: post.image_base64 === null ? undefined : post.image_base64,
                    likes_count: post.likes_count,
                    comments_count: post.comments_count,
                    user_has_liked: post.user_has_liked,
                  }

                  return (
                    <Box key={post.id} width="100%" marginBottom="m">
                      <PostCard post={postCardProps} onLike={() => handleLikePost(post.id)} />
                    </Box>
                  )
                })}
              </Box>
            )}
          </Box>
        </Box>
      </ScrollView>

      {!isCurrentUser && (
        <ReportPostModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          postId=""
          postOwnerId={profile.id}
        />
      )}
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
  licensePlateContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  additionalPlatesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  licensePlate: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    fontWeight: "600",
    overflow: "hidden",
  },
})

export default UserProfileScreen
