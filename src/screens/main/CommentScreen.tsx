"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Animated,
  Alert,
  RefreshControl,
  type KeyboardEvent,
} from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import { supabase } from "../../lib/supabase"
import {
  Send,
  ArrowLeft,
  X,
  Heart,
  MessageCircle,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native"
import Text from "../../components/ui/Text"
import { usePolling } from "../../hooks/usePolling"
import type { RootStackParamList } from "../../navigation"
import { useAuth } from "../../context/AuthContext"
import { formatDistanceToNow, format } from "date-fns"
import { de } from "date-fns/locale"
import { StatusBar } from "expo-status-bar"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Define comment type
interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  post_id: string
  parent_id: string | null
  likes_count: number
  username: string
  license_plate: string
  user_has_liked?: boolean
  replies?: Comment[]
  isExpanded?: boolean
}

// Define the route params type
type CommentScreenRouteProp = RouteProp<RootStackParamList, "Comments">

const { width, height } = Dimensions.get("window")
const isTablet = width >= 768

const CommentScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme()
  const navigation = useNavigation()
  const route = useRoute<CommentScreenRouteProp>()
  const { postId, postContent } = route.params
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef<TextInput>(null)
  const listRef = useRef<FlatList>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const replyFadeAnim = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [showOptions, setShowOptions] = useState<string | null>(null)
  const [groupedComments, setGroupedComments] = useState<Comment[]>([])
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "popular">("newest")
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => {
        setIsKeyboardVisible(true)
        setKeyboardHeight(e.endCoordinates.height)
      },
    )
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false)
        setKeyboardHeight(0)
      },
    )

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  // Animation für neue Kommentare
  const animateNewComment = () => {
    // Reset animations
    fadeAnim.setValue(0)
    slideAnim.setValue(50)

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Animation für Reply-Anzeige
  useEffect(() => {
    if (replyTo) {
      // Fade in
      Animated.timing(replyFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      // Fade out
      Animated.timing(replyFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [replyTo, replyFadeAnim])

  // Gruppiere Kommentare nach Eltern/Antworten
  const groupCommentsByParent = useCallback(
    (flatComments: Comment[]) => {
      const commentMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      // Erstelle eine Map aller Kommentare
      flatComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [], isExpanded: true })
      })

      // Organisiere Kommentare in eine Baumstruktur
      flatComments.forEach((comment) => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          const parentComment = commentMap.get(comment.parent_id)
          if (parentComment && parentComment.replies) {
            parentComment.replies.push(commentMap.get(comment.id) || comment)
          }
        } else {
          rootComments.push(commentMap.get(comment.id) || comment)
        }
      })

      // Sortiere die Kommentare
      return sortComments(rootComments, sortOrder)
    },
    [sortOrder],
  )

  // Sortiere Kommentare basierend auf der ausgewählten Sortierreihenfolge
  const sortComments = (commentsToSort: Comment[], order: "newest" | "oldest" | "popular") => {
    const sortedComments = [...commentsToSort]

    switch (order) {
      case "newest":
        sortedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        sortedComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "popular":
        sortedComments.sort((a, b) => b.likes_count - a.likes_count)
        break
    }

    // Sortiere auch die Antworten
    sortedComments.forEach((comment) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = sortComments(comment.replies, order)
      }
    })

    return sortedComments
  }

  // Aktualisiere die gruppierten Kommentare, wenn sich die flachen Kommentare oder die Sortierreihenfolge ändern
  useEffect(() => {
    const grouped = groupCommentsByParent(comments)
    setGroupedComments(grouped)
  }, [comments, groupCommentsByParent])

  // Fetch comments
  const fetchComments = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setRefreshing(true)
      } else if (!initialLoadComplete) {
        setLoading(true)
      }

      setError(null)

      try {
        // Get comments from database
        const { data, error } = await supabase
          .from("comments")
          .select(`
            id,
            content,
            created_at,
            user_id,
            post_id,
            parent_id,
            likes_count,
            profiles(username, license_plate)
          `)
          .eq("post_id", postId)

        if (error) {
          console.error("Error fetching comments:", error)
          setError("Fehler beim Laden der Kommentare. Bitte versuche es später erneut.")
          return
        }

        // Format comments with user info
        const formattedComments: Comment[] = data.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          post_id: comment.post_id,
          parent_id: comment.parent_id,
          likes_count: comment.likes_count || 0,
          username: comment.profiles?.username || "Unbekannter Benutzer",
          license_plate: comment.profiles?.license_plate || "??",
          user_has_liked: false, // Default value, will be updated below
        }))

        // Check if user has liked each comment
        if (isAuthenticated && user) {
          const { data: likedComments } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)

          const likedCommentIds = new Set(likedComments?.map((like: any) => like.comment_id) || [])

          formattedComments.forEach((comment) => {
            comment.user_has_liked = likedCommentIds.has(comment.id)
          })
        }

        setComments(formattedComments)

        // Animate if this is not the initial load or a refresh
        if (initialLoadComplete && !refreshing) {
          animateNewComment()
        }
      } catch (error) {
        console.error("Error in fetchComments:", error)
        setError("Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.")
      } finally {
        setLoading(false)
        setRefreshing(false)
        setInitialLoadComplete(true)
      }
    },
    [postId, isAuthenticated, user, initialLoadComplete, refreshing],
  )

  // Use polling to refresh comments
  usePolling(fetchComments, 30000) // Refresh every 30 seconds

  // Initial fetch
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isAuthenticated || !user) {
      if (!isAuthenticated) {
        Alert.alert("Nicht angemeldet", "Du musst angemeldet sein, um einen Kommentar zu schreiben.")
      }
      return
    }

    setSubmitting(true)
    try {
      const commentData = {
        post_id: postId,
        content: newComment.trim(),
        user_id: user.id,
        parent_id: replyTo,
      }

      const { error } = await supabase.from("comments").insert(commentData)

      if (error) {
        console.error("Error submitting comment:", error)
        Alert.alert("Fehler", "Dein Kommentar konnte nicht gespeichert werden. Bitte versuche es später erneut.")
      } else {
        setNewComment("")
        setReplyTo(null)
        setReplyToUsername(null)
        Keyboard.dismiss()

        // Fetch comments immediately after submitting
        await fetchComments()

        // Animate the new comment
        animateNewComment()
      }
    } catch (error) {
      console.error("Error in handleSubmitComment:", error)
      Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.")
    }
    setSubmitting(false)
  }

  // Handle like comment
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Nicht angemeldet", "Du musst angemeldet sein, um einen Kommentar zu liken.")
      return
    }

    try {
      // Check if user already liked this comment
      const { data: existingLike } = await supabase
        .from("comment_likes")
        .select()
        .eq("user_id", user.id)
        .eq("comment_id", commentId)
        .single()

      if (existingLike) {
        // Unlike
        await supabase.from("comment_likes").delete().eq("user_id", user.id).eq("comment_id", commentId)
      } else {
        // Like
        await supabase.from("comment_likes").insert({
          user_id: user.id,
          comment_id: commentId,
        })
      }

      // Update local state
      const updateCommentLike = (commentsList: Comment[]): Comment[] => {
        return commentsList.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes_count: existingLike ? comment.likes_count - 1 : comment.likes_count + 1,
              user_has_liked: !comment.user_has_liked,
            }
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentLike(comment.replies),
            }
          }
          return comment
        })
      }

      setComments((prevComments) => updateCommentLike(prevComments))
    } catch (error) {
      console.error("Error in handleLikeComment:", error)
      Alert.alert("Fehler", "Dein Like konnte nicht gespeichert werden. Bitte versuche es später erneut.")
    }
  }

  // Handle reply to comment
  const handleReplyToComment = (commentId: string, username: string) => {
    if (!isAuthenticated) {
      Alert.alert("Nicht angemeldet", "Du musst angemeldet sein, um auf einen Kommentar zu antworten.")
      return
    }
    setReplyTo(commentId)
    setReplyToUsername(username)
    inputRef.current?.focus()
  }

  // Cancel reply
  const cancelReply = () => {
    setReplyTo(null)
    setReplyToUsername(null)
  }

  // Handle edit comment
  const handleEditComment = (commentId: string, content: string) => {
    setEditingComment(commentId)
    setEditText(content)
    setShowOptions(null)
  }

  // Save edited comment
  const saveEditedComment = async () => {
    if (!editingComment || !editText.trim() || !isAuthenticated || !user) return

    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: editText.trim() })
        .eq("id", editingComment)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error updating comment:", error)
        Alert.alert("Fehler", "Dein Kommentar konnte nicht aktualisiert werden. Bitte versuche es später erneut.")
      } else {
        // Update local state
        const updateEditedComment = (commentsList: Comment[]): Comment[] => {
          return commentsList.map((comment) => {
            if (comment.id === editingComment) {
              return {
                ...comment,
                content: editText.trim(),
              }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateEditedComment(comment.replies),
              }
            }
            return comment
          })
        }

        setComments((prevComments) => updateEditedComment(prevComments))
        setEditingComment(null)
        setEditText("")
      }
    } catch (error) {
      console.error("Error in saveEditedComment:", error)
      Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.")
    }
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditingComment(null)
    setEditText("")
  }

  // Delete comment
  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Kommentar löschen",
      "Möchtest du diesen Kommentar wirklich löschen?",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            if (!isAuthenticated || !user) return

            try {
              const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id)

              if (error) {
                console.error("Error deleting comment:", error)
                Alert.alert("Fehler", "Dein Kommentar konnte nicht gelöscht werden. Bitte versuche es später erneut.")
              } else {
                // Update local state
                const removeDeletedComment = (commentsList: Comment[]): Comment[] => {
                  return commentsList.filter((comment) => {
                    if (comment.id === commentId) {
                      return false
                    }
                    if (comment.replies && comment.replies.length > 0) {
                      comment.replies = removeDeletedComment(comment.replies)
                    }
                    return true
                  })
                }

                setComments((prevComments) => removeDeletedComment(prevComments))
                setShowOptions(null)
              }
            } catch (error) {
              console.error("Error in handleDeleteComment:", error)
              Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.")
            }
          },
        },
      ],
      { cancelable: true },
    )
  }

  // Toggle comment options
  const toggleOptions = (commentId: string | null) => {
    setShowOptions(commentId === showOptions ? null : commentId)
  }

  // Toggle comment expansion
  const toggleCommentExpansion = (commentId: string) => {
    const updateCommentExpansion = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isExpanded: !comment.isExpanded,
          }
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentExpansion(comment.replies),
          }
        }
        return comment
      })
    }

    setGroupedComments((prevComments) => updateCommentExpansion(prevComments))
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: de,
      })
    } else {
      return format(date, "dd.MM.yyyy HH:mm", { locale: de })
    }
  }

  // Render a comment item
  const renderComment = (comment: Comment, isReply = false, isFirstItem = false) => {
    const isCurrentUserComment = isAuthenticated && user && user.id === comment.user_id
    const showReplies = comment.isExpanded !== false
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <View key={comment.id}>
        <Animated.View
          style={[
            styles.commentItem,
            isReply && styles.replyItem,
            isFirstItem &&
              initialLoadComplete &&
              !loading && {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" },
          ]}
        >
          <View style={styles.commentHeader}>
            <View style={styles.userInfo}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: isCurrentUserComment ? theme.colors.primary : theme.colors.primaryLight,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isCurrentUserComment ? "#fff" : theme.colors.primary,
                    fontWeight: "bold",
                  }}
                >
                  {comment.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <View style={styles.usernameContainer}>
                  <Text style={[styles.username, { color: theme.colors.primaryText }]}>{comment.username}</Text>
                  {isCurrentUserComment && (
                    <View style={[styles.authorBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.authorBadgeText}>Du</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: theme.colors.secondaryText, fontSize: 12 }}>{comment.license_plate}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.timeContainer}>
                <Clock size={12} color={theme.colors.secondaryText} style={styles.timeIcon} />
                <Text style={{ color: theme.colors.secondaryText, fontSize: 12 }}>
                  {formatDate(comment.created_at)}
                </Text>
              </View>

              {isCurrentUserComment && (
                <TouchableOpacity
                  style={styles.optionsButton}
                  onPress={() => toggleOptions(comment.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MoreVertical size={16} color={theme.colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {showOptions === comment.id && (
            <View
              style={[
                styles.optionsMenu,
                {
                  backgroundColor: isDarkMode ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.95)",
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleEditComment(comment.id, comment.content)}
              >
                <Edit size={16} color={theme.colors.primaryText} style={styles.optionIcon} />
                <Text style={{ color: theme.colors.primaryText }}>Bearbeiten</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleDeleteComment(comment.id)}>
                <Trash2 size={16} color={theme.colors.error} style={styles.optionIcon} />
                <Text style={{ color: theme.colors.error }}>Löschen</Text>
              </TouchableOpacity>
            </View>
          )}

          {editingComment === comment.id ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: theme.colors.primaryText,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: theme.colors.border }]}
                  onPress={cancelEdit}
                >
                  <Text style={{ color: theme.colors.primaryText }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    {
                      backgroundColor: theme.colors.primary,
                      marginLeft: 8,
                    },
                  ]}
                  onPress={saveEditedComment}
                >
                  <Text style={{ color: "#fff" }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.commentContent, { color: theme.colors.primaryText }]}>{comment.content}</Text>
          )}

          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLikeComment(comment.id)}
              activeOpacity={0.7}
            >
              <Heart
                size={16}
                color={comment.user_has_liked ? theme.colors.accent : theme.colors.secondaryText}
                fill={comment.user_has_liked ? theme.colors.accent : "none"}
                style={styles.actionIcon}
              />
              <Text
                style={{
                  color: comment.user_has_liked ? theme.colors.accent : theme.colors.secondaryText,
                  fontWeight: comment.user_has_liked ? "bold" : "normal",
                  fontSize: 12,
                }}
              >
                {comment.likes_count} {comment.likes_count === 1 ? "Like" : "Likes"}
              </Text>
            </TouchableOpacity>

            {!isReply && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReplyToComment(comment.id, comment.username)}
                activeOpacity={0.7}
              >
                <MessageCircle size={16} color={theme.colors.secondaryText} style={styles.actionIcon} />
                <Text style={{ color: theme.colors.secondaryText, fontSize: 12 }}>Antworten</Text>
              </TouchableOpacity>
            )}

            {hasReplies && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleCommentExpansion(comment.id)}
                activeOpacity={0.7}
              >
                {showReplies ? (
                  <ChevronUp size={16} color={theme.colors.secondaryText} style={styles.actionIcon} />
                ) : (
                  <ChevronDown size={16} color={theme.colors.secondaryText} style={styles.actionIcon} />
                )}
                <Text style={{ color: theme.colors.secondaryText, fontSize: 12 }}>
                  {showReplies ? "Antworten ausblenden" : `${comment.replies?.length} Antworten anzeigen`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Render replies */}
        {hasReplies && showReplies && (
          <View style={styles.repliesContainer}>{comment.replies?.map((reply) => renderComment(reply, true))}</View>
        )}
      </View>
    )
  }

  // Render loading state
  const renderLoading = () => {
    if (!initialLoadComplete && loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.secondaryText }]}>Kommentare werden geladen...</Text>
        </View>
      )
    }
    return null
  }

  // Render error state
  const renderError = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color={theme.colors.error} style={{ marginBottom: 16 }} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => fetchComments()}
          >
            <Text style={{ color: "#fff", fontWeight: "500" }}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return null
  }

  // Render empty state
  const renderEmpty = () => {
    if (initialLoadComplete && !loading && !error && groupedComments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MessageCircle size={40} color={theme.colors.secondaryText} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>
            Noch keine Kommentare. Sei der Erste!
          </Text>
        </View>
      )
    }
    return null
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            paddingTop: insets.top,
            backgroundColor: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)",
          },
        ]}
      >
        <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>Kommentare</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {sortOrder === "newest" && <Clock size={20} color={theme.colors.primaryText} />}
          {sortOrder === "oldest" && <Clock size={20} color={theme.colors.primaryText} />}
          {sortOrder === "popular" && <Heart size={20} color={theme.colors.primaryText} />}
        </TouchableOpacity>
      </View>

      {/* Sort options dropdown */}
      {showSortOptions && (
        <View
          style={[
            styles.sortOptionsContainer,
            {
              backgroundColor: isDarkMode ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.95)",
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOrder === "newest" && {
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setSortOrder("newest")
              setShowSortOptions(false)
            }}
          >
            <Clock size={16} color={theme.colors.primaryText} style={styles.sortOptionIcon} />
            <Text style={{ color: theme.colors.primaryText }}>Neueste zuerst</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOrder === "oldest" && {
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setSortOrder("oldest")
              setShowSortOptions(false)
            }}
          >
            <Clock size={16} color={theme.colors.primaryText} style={styles.sortOptionIcon} />
            <Text style={{ color: theme.colors.primaryText }}>Älteste zuerst</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOrder === "popular" && {
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setSortOrder("popular")
              setShowSortOptions(false)
            }}
          >
            <Heart size={16} color={theme.colors.primaryText} style={styles.sortOptionIcon} />
            <Text style={{ color: theme.colors.primaryText }}>Beliebteste zuerst</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Post content preview */}
      <View
        style={[
          styles.postPreview,
          {
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : theme.colors.cardBackground,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={[styles.postPreviewGradient, { backgroundColor: theme.colors.primary }]} />
        <Text style={[styles.postContent, { color: theme.colors.primaryText }]}>{postContent}</Text>
      </View>

      {/* Comments list */}
      <FlatList
        ref={listRef}
        data={groupedComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => renderComment(item, false, index === 0)}
        contentContainerStyle={[
          styles.commentsList,
          isTablet && styles.tabletCommentsList,
          { paddingBottom: 100 + insets.bottom + (isKeyboardVisible ? keyboardHeight : 0) },
        ]}
        ListHeaderComponent={
          <>
            {renderLoading()}
            {renderError()}
            {renderEmpty()}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchComments(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onContentSizeChange={() => {
          if (isKeyboardVisible && inputRef.current) {
            listRef.current?.scrollToEnd({ animated: true })
          }
        }}
        onLayout={() => {
          if (isKeyboardVisible && inputRef.current) {
            listRef.current?.scrollToEnd({ animated: true })
          }
        }}
      />

      {/* Reply indicator */}
      {replyTo && (
        <Animated.View
          style={[
            styles.replyIndicator,
            {
              backgroundColor: isDarkMode ? "rgba(30,30,30,0.9)" : "rgba(245,245,245,0.9)",
              borderTopColor: theme.colors.border,
              opacity: replyFadeAnim,
              bottom: 64 + (isKeyboardVisible ? keyboardHeight : 0),
            },
          ]}
        >
          <BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: "500" }}>
            Antwort an @{replyToUsername}
          </Text>
          <TouchableOpacity
            onPress={cancelReply}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.cancelReplyButton}
          >
            <X size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Comment input */}
      <View
        style={[
          styles.inputContainer,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: isDarkMode ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.9)",
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            bottom: isKeyboardVisible ? keyboardHeight : 0,
          },
        ]}
      >
        <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              color: theme.colors.primaryText,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder={replyTo ? "Schreibe eine Antwort..." : "Schreibe einen Kommentar..."}
          placeholderTextColor={theme.colors.secondaryText}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          onFocus={() => {
            // Scroll to the input when focused
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: true })
            }, 100)
          }}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: newComment.trim() ? theme.colors.primary : theme.colors.border,
              transform: [{ scale: newComment.trim() ? 1 : 0.9 }],
            },
          ]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || submitting}
          activeOpacity={0.7}
        >
          {submitting ? <ActivityIndicator size="small" color="white" /> : <Send size={20} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sortButton: {
    padding: 8,
    borderRadius: 20,
  },
  sortOptionsContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    width: 180,
  },
  sortOptionIcon: {
    marginRight: 8,
  },
  postPreview: {
    padding: 16,
    borderBottomWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  postPreviewGradient: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentsList: {
    padding: 16,
  },
  tabletCommentsList: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  loadingContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: "hidden",
  },
  cancelReplyButton: {
    padding: 4,
    borderRadius: 12,
  },
  commentItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  replyItem: {
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(0,0,0,0.1)",
  },
  repliesContainer: {
    marginLeft: 20,
    marginTop: -8,
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
    marginRight: 6,
  },
  authorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authorBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  timeIcon: {
    marginRight: 4,
  },
  optionsButton: {
    padding: 4,
  },
  optionsMenu: {
    position: "absolute",
    top: 50,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    width: 150,
  },
  optionIcon: {
    marginRight: 8,
  },
  editContainer: {
    marginBottom: 12,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minHeight: 80,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  commentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    paddingVertical: 4,
    marginBottom: 4,
  },
  actionIcon: {
    marginRight: 4,
  },
})

export default CommentScreen
