"use client"

import type React from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { Heart, Reply } from "lucide-react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../navigation"
import VerificationBadge from "./VerificationBadge"

type Comment = {
  id: string
  content: string
  created_at: string
  user_id?: string
  username?: string
  license_plate?: string
  user?: {
    id: string
    username: string
    license_plate: string
    verification_status?: "not_verified" | "pending" | "verified" | "rejected"
  }
  user_has_liked?: boolean
  likes_count?: number
}

interface CommentItemProps {
  comment: Comment
  onLike?: () => void
  onReply?: () => void
  isReply?: boolean
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onLike, onReply, isReply = false }) => {
  const { theme } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const handleUserPress = () => {
    if (comment.user) {
      navigation.navigate("UserProfile", { userId: comment.user.id })
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: de })
  }

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>
              {comment.user?.username?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text variant="subtitle" style={styles.username}>
                {comment.user?.username || "Unbekannter Benutzer"}
              </Text>
              <View style={{ marginLeft: 4 }}>
                <VerificationBadge status={comment.user?.verification_status || "not_verified"} size="small" />
              </View>
            </View>
            <Text variant="small" style={{ color: theme.colors.secondaryText }}>
              {comment.user?.license_plate || ""}
            </Text>
          </View>
        </View>
        <Text variant="small" style={{ color: theme.colors.secondaryText }}>
          {formatDate(comment.created_at)}
        </Text>
      </View>

      <Text variant="body" style={styles.content}>
        {comment.content}
      </Text>

      <View style={styles.actions}>
        {onLike && (
          <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <Heart
              size={16}
              color={comment.user_has_liked ? theme.colors.accent : theme.colors.secondaryText}
              fill={comment.user_has_liked ? theme.colors.accent : "none"}
            />
            <Text variant="small" style={styles.actionText}>
              {comment.likes_count || 0}
            </Text>
          </TouchableOpacity>
        )}

        {onReply && !isReply && (
          <TouchableOpacity style={styles.actionButton} onPress={onReply}>
            <Reply size={16} color={theme.colors.secondaryText} />
            <Text variant="small" style={styles.actionText}>
              Antworten
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  replyContainer: {
    marginLeft: 40,
    paddingTop: 8,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  content: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
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

export default CommentItem
