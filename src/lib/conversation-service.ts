import { supabase } from "./supabase"

// Typen für Konversationen und Nachrichten
export interface Conversation {
  id: string
  created_at: string
  participants?: ConversationParticipant[]
  last_message?: Message
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  created_at: string
  profile?: {
    username: string
    license_plate: string
    avatar_url?: string
  }
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  read: boolean
  created_at: string
}

// Service für Konversationsoperationen
export const conversationService = {
  // Konversation erstellen
  async createConversation(currentUserId: string, otherUserId: string) {
    try {
      console.log("Erstelle Konversation zwischen", currentUserId, "und", otherUserId)

      // Prüfe, ob bereits eine Konversation existiert
      const existingConversation = await this.findExistingConversation(currentUserId, otherUserId)
      if (existingConversation) {
        console.log("Bestehende Konversation gefunden:", existingConversation.id)
        return { conversation: existingConversation, error: null }
      }

      // Erstelle eine neue Konversation
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ created_at: new Date().toISOString() })
        .select()
        .single()

      if (conversationError) {
        console.error("Fehler beim Erstellen der Konversation:", conversationError)
        throw conversationError
      }

      // Füge Teilnehmer hinzu
      const participants = [
        {
          conversation_id: newConversation.id,
          user_id: currentUserId,
          created_at: new Date().toISOString(),
        },
        {
          conversation_id: newConversation.id,
          user_id: otherUserId,
          created_at: new Date().toISOString(),
        },
      ]

      const { error: participantsError } = await supabase.from("conversation_participants").insert(participants)

      if (participantsError) {
        console.error("Fehler beim Hinzufügen der Teilnehmer:", participantsError)
        throw participantsError
      }

      return { conversation: newConversation, error: null }
    } catch (error) {
      console.error("Fehler im Konversationsservice:", error)
      return { conversation: null, error }
    }
  },

  // Bestehende Konversation finden
  async findExistingConversation(userId1: string, userId2: string) {
    try {
      // Finde Konversationen, an denen der erste Benutzer teilnimmt
      const { data: user1Conversations, error: user1Error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId1)

      if (user1Error) throw user1Error
      if (!user1Conversations || user1Conversations.length === 0) return null

      // Extrahiere die Konversations-IDs
      const conversationIds = user1Conversations.map((p) => p.conversation_id)

      // Finde Konversationen, an denen auch der zweite Benutzer teilnimmt
      const { data: user2Participants, error: user2Error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId2)
        .in("conversation_id", conversationIds)

      if (user2Error) throw user2Error
      if (!user2Participants || user2Participants.length === 0) return null

      // Hole die erste gemeinsame Konversation
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", user2Participants[0].conversation_id)
        .single()

      if (conversationError) throw conversationError
      return conversation
    } catch (error) {
      console.error("Fehler beim Suchen einer bestehenden Konversation:", error)
      return null
    }
  },

  // Konversationen eines Benutzers abrufen
  async getUserConversations(userId: string) {
    try {
      // Hole alle Konversationen, an denen der Benutzer teilnimmt
      const { data: participations, error: participationsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId)

      if (participationsError) throw participationsError
      if (!participations || participations.length === 0) return { conversations: [], error: null }

      // Extrahiere die Konversations-IDs
      const conversationIds = participations.map((p) => p.conversation_id)

      // Hole die Konversationen mit Teilnehmern und letzter Nachricht
      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select(
          `
          id,
          created_at,
          conversation_participants!inner (
            id,
            user_id,
            created_at,
            profiles (
              username,
              license_plate,
              avatar_url
            )
          )
        `,
        )
        .in("id", conversationIds)
        .order("created_at", { ascending: false })

      if (conversationsError) throw conversationsError

      // Hole für jede Konversation die letzte Nachricht
      const conversationsWithLastMessage = await Promise.all(
        conversations.map(async (conversation) => {
          const { data: messages, error: messagesError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)

          if (messagesError) {
            console.error("Fehler beim Abrufen der letzten Nachricht:", messagesError)
            return {
              ...conversation,
              last_message: null,
            }
          }

          return {
            ...conversation,
            last_message: messages && messages.length > 0 ? messages[0] : null,
          }
        }),
      )

      // Sortiere nach dem Zeitpunkt der letzten Nachricht
      conversationsWithLastMessage.sort((a, b) => {
        if (!a.last_message && !b.last_message) return 0
        if (!a.last_message) return 1
        if (!b.last_message) return -1
        return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
      })

      return { conversations: conversationsWithLastMessage, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen der Konversationen:", error)
      return { conversations: [], error }
    }
  },

  // Nachrichten einer Konversation abrufen
  async getConversationMessages(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return { messages: data, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen der Nachrichten:", error)
      return { messages: [], error }
    }
  },

  // Nachricht senden
  async sendMessage(conversationId: string, userId: string, content: string) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return { message: data, error: null }
    } catch (error) {
      console.error("Fehler beim Senden der Nachricht:", error)
      return { message: null, error }
    }
  },

  // Nachrichten als gelesen markieren
  async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("user_id", userId)
        .eq("read", false)

      if (error) throw error
      return { success: true, error: null }
    } catch (error) {
      console.error("Fehler beim Markieren der Nachrichten als gelesen:", error)
      return { success: false, error }
    }
  },

  // Konversationsteilnehmer abrufen
  async getConversationParticipants(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          `
          id,
          user_id,
          created_at,
          profiles (
            username,
            license_plate,
            avatar_url
          )
        `,
        )
        .eq("conversation_id", conversationId)

      if (error) throw error
      return { participants: data, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen der Konversationsteilnehmer:", error)
      return { participants: [], error }
    }
  },

  // Konversation löschen
  async deleteConversation(conversationId: string) {
    try {
      // Lösche zuerst alle Nachrichten
      const { error: messagesError } = await supabase.from("messages").delete().eq("conversation_id", conversationId)

      if (messagesError) throw messagesError

      // Lösche dann alle Teilnehmer
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)

      if (participantsError) throw participantsError

      // Lösche schließlich die Konversation selbst
      const { error: conversationError } = await supabase.from("conversations").delete().eq("id", conversationId)

      if (conversationError) throw conversationError

      return { success: true, error: null }
    } catch (error) {
      console.error("Fehler beim Löschen der Konversation:", error)
      return { success: false, error }
    }
  },
}
