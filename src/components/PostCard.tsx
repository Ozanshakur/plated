"use client"

import type React from "react"
import { View, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, Share, Alert } from "react-native"
import { Heart, MessageCircle, Share2, ImageOff, RefreshCw, MoreVertical, Flag, Trash2 } from "lucide-react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import Card from "./ui/Card"
import { useState, useEffect, useCallback } from "react"
import { isBase64Image } from "../lib/image-utils"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../navigation"
import ReportPostModal from "./ReportPostModal"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"
import VerificationBadge from "./VerificationBadge"

interface PostCardProps {
  post: {
    id: string
    user_id: string
    username: string
    license_plate: string
    content: string
    image_url?: string
    image_base64?: string
    likes_count: number
    comments_count: number
    user_has_liked?: boolean
    verification_status?: "not_verified" | "pending" | "verified" | "rejected"
  }
  onLike: () => void
  onImagePress?: () => void
}

const { width } = Dimensions.get("window")
const CARD_PADDING = 16
const CARD_WIDTH = width - CARD_PADDING * 2

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onImagePress }) => {
  const { theme } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSource, setImageSource] = useState<any>(undefined)
  const [retryCount, setRetryCount] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const { user } = useAuth()

  const loadImage = useCallback(() => {
    // Überprüfe, ob ein Base64-Bild vorhanden ist
    if (post.image_base64 && isBase64Image(post.image_base64)) {
      console.log(`PostCard: Post ${post.id} hat ein Base64-Bild (gekürzt): ${post.image_base64.substring(0, 30)}...`)
      setImageSource({ uri: post.image_base64 })
    }
    // Wenn nicht, versuche es mit der URL
    else if (post.image_url) {
      console.log(`PostCard: Post ${post.id} hat eine Bild-URL: ${post.image_url}`)
      // Füge einen Zeitstempel hinzu, um Caching-Probleme zu vermeiden
      const timestamp = Date.now()
      setImageSource({ uri: `${post.image_url}?t=${timestamp}&retry=${retryCount}` })
    } else {
      console.log(`PostCard: Post ${post.id} hat kein Bild`)
      setImageSource(undefined)
    }
  }, [post.id, post.image_base64, post.image_url, retryCount])

  useEffect(() => {
    loadImage()
  }, [loadImage])

  const retryLoadImage = () => {
    setImageError(false)
    setImageLoading(true)
    setRetryCount((prev) => prev + 1)
  }

  const handleComment = () => {
    navigation.navigate("Comments", {
      postId: post.id,
      postContent: post.content,
    })
  }

  const handleShare = async () => {
    try {
      // Erstelle einen Deep-Link zur App
      const deepLink = `plated://post/${post.id}`

      // Erstelle eine Web-URL als Fallback (falls die App nicht installiert ist)
      const webUrl = `https://plated-app.com/post/${post.id}`

      const message = `${post.content}\n\nGeteilt von ${post.username} (${post.license_plate}) über Plated\n\nÖffne diesen Beitrag in der App: ${deepLink}\nOder im Web: ${webUrl}`

      await Share.share({
        message,
        // Für iOS kann ein separater Titel angegeben werden
        title: `Beitrag von ${post.username}`,
      })
    } catch (error) {
      console.error("Fehler beim Teilen:", error)
    }
  }

  const handleImagePress = () => {
    if (hasImage && !imageError && onImagePress) {
      onImagePress()
    }
  }

  const handleUserPress = () => {
    // If the post belongs to the current user, navigate to the Profile tab
    if (user && post.user_id === user.id) {
      // Navigate to the Main screen first (which contains the tab navigator)
      ;(navigation as any).navigate("Main")
      // Then we can access the bottom tab navigator to switch to the Profile tab
      // This is a common pattern for nested navigators
    } else {
      // Otherwise navigate to the UserProfile screen
      navigation.navigate("UserProfile", { userId: post.user_id })
    }
  }

  const handleOptionsPress = () => {
    setShowOptions(!showOptions)
  }

  const handleReport = () => {
    setShowOptions(false)
    setShowReportModal(true)
  }

  const handleDeletePost = () => {
    setShowOptions(false)

    Alert.alert(
      "Beitrag löschen",
      "Möchtest du diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the post from Supabase
              const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user?.id) // Ensure the user can only delete their own posts

              if (error) throw error

              // Show success message
              Alert.alert("Erfolg", "Dein Beitrag wurde erfolgreich gelöscht.")

              // Refresh the profile screen to update the posts list
              // Navigate back to the Main screen which contains the tab navigator
              if (navigation.canGoBack()) {
                navigation.goBack()
              }
              // Navigate to the Main screen
              ;(navigation as any).navigate("Main")
            } catch (error) {
              console.error("Fehler beim Löschen des Beitrags:", error)
              Alert.alert(
                "Fehler",
                "Beim Löschen des Beitrags ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
              )
            }
          },
        },
      ],
    )
  }

  const hasImage = !!imageSource

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>
              {post.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text variant="subtitle" style={styles.username}>
                {post.username}
              </Text>
              <View style={{ marginLeft: 4 }}>
                <VerificationBadge status={post.verification_status || "not_verified"} size="small" />
              </View>
            </View>
            <Text variant="small" style={{ color: theme.colors.secondaryText }}>
              {post.license_plate}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleOptionsPress} style={styles.optionsButton}>
          <MoreVertical size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {showOptions && (
        <View
          style={[
            styles.optionsMenu,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {user && post.user_id === user.id ? (
            // Show delete option for user's own posts
            <TouchableOpacity style={styles.optionItem} onPress={handleDeletePost}>
              <Trash2 size={16} color={theme.colors.error} />
              <Text variant="body" color="error" style={styles.optionText}>
                Beitrag löschen
              </Text>
            </TouchableOpacity>
          ) : (
            // Show report option for other users' posts
            <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
              <Flag size={16} color={theme.colors.error} />
              <Text variant="body" color="error" style={styles.optionText}>
                Beitrag melden
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text variant="body" style={styles.content}>
        {post.content}
      </Text>

      {hasImage && !imageError ? (
        <TouchableOpacity activeOpacity={0.9} onPress={handleImagePress} style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.image}
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => {
              console.log(`PostCard: Bild für Post ${post.id} erfolgreich geladen`)
              setImageLoading(false)
            }}
            onError={(error) => {
              console.error(`PostCard: Fehler beim Laden des Bildes für Post ${post.id}:`, error.nativeEvent)
              setImageLoading(false)
              setImageError(true)
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      ) : hasImage ? (
        <TouchableOpacity
          style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceBackground }]}
          onPress={retryLoadImage}
          activeOpacity={0.7}
        >
          <View style={styles.errorContainer}>
            <ImageOff size={32} color={theme.colors.secondaryText} />
            <Text style={styles.errorText} color="secondaryText">
              Bild konnte nicht geladen werden
            </Text>
            <View style={styles.retryContainer}>
              <RefreshCw size={16} color={theme.colors.primary} />
              <Text style={styles.retryText} color="primary">
                Tippen zum erneuten Laden
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Heart
            size={20}
            color={post.user_has_liked ? theme.colors.accent : theme.colors.secondaryText}
            fill={post.user_has_liked ? theme.colors.accent : "none"}
          />
          <Text variant="small" style={styles.actionText}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <MessageCircle size={20} color={theme.colors.secondaryText} />
          <Text variant="small" style={styles.actionText}>
            {post.comments_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      <ReportPostModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post.id}
        postOwnerId={post.user_id}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  username: {
    fontWeight: "600",
    fontSize: 16,
  },
  optionsButton: {
    padding: 8,
  },
  optionsMenu: {
    position: "absolute",
    top: 50,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  optionText: {
    marginLeft: 8,
  },
  content: {
    marginBottom: 12,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imageLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  errorContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 8,
    textAlign: "center",
  },
  retryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  retryText: {
    marginLeft: 4,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  actionText: {
    marginLeft: 4,
  },
})

export default PostCard
