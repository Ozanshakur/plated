"use client"

import React from "react"
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from "react-native"
import { Heart, MessageCircle } from "lucide-react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import Card from "./ui/Card"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../navigation"

interface FeaturedPostProps {
  post: {
    id: string
    user_id: string
    content: string
    image_url?: string
    created_at: string
    username: string
    license_plate: string
    likes_count: number
    comments_count: number
    user_has_liked?: boolean
  }
  onPress: () => void
  onLike: () => void
  onImagePress?: () => void
}

const { width } = Dimensions.get("window")
const CARD_WIDTH = Math.min(width * 0.8, 300)

const FeaturedPost: React.FC<FeaturedPostProps> = ({ post, onPress, onLike, onImagePress }) => {
  const { theme } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [imageLoading, setImageLoading] = React.useState(false)

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  const handleUserPress = () => {
    navigation.navigate("UserProfile", { userId: post.user_id })
  }

  return (
    <Card variant="elevated" style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.innerCard}>
        {post.image_url ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onImagePress}
            style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceBackground }]}
          >
            <Image
              source={{ uri: post.image_url }}
              style={styles.image}
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.noImageContainer, { backgroundColor: theme.colors.surfaceBackground }]}>
            <Text variant="caption" color="secondaryText">
              Kein Bild
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>
                {post.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.usernameContainer}>
              <Text variant="caption" numberOfLines={1} style={styles.username}>
                {post.username}
              </Text>
              <Text variant="small" color="secondaryText" numberOfLines={1} style={styles.licensePlate}>
                {post.license_plate}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
            <Text variant="body" numberOfLines={2} style={styles.postText}>
              {truncateContent(post.content, 80)}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={onLike}>
              <Heart
                size={16}
                color={post.user_has_liked ? theme.colors.accent : theme.colors.secondaryText}
                fill={post.user_has_liked ? theme.colors.accent : "none"}
              />
              <Text variant="small" style={styles.actionText}>
                {post.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onPress}>
              <MessageCircle size={16} color={theme.colors.secondaryText} />
              <Text variant="small" style={styles.actionText}>
                {post.comments_count}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    // Enhanced shadow for better depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  innerCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  imageContainer: {
    height: 140, // Slightly taller image
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  image: {
    height: "100%",
    width: "100%",
    resizeMode: "cover",
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
  noImageContainer: {
    height: 140,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  usernameContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  licensePlate: {
    fontSize: 12,
    marginTop: 2,
  },
  postText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
  },
})

export default FeaturedPost
