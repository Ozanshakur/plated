"use client"

import type React from "react"
import { useState } from "react"
import { StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, StatusBar, TouchableOpacity } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import { Download, ArrowLeft, Shield, FileText, User, MessageSquare, ThumbsUp, Car } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { SafeAreaView } from "react-native-safe-area-context"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0

// Define types for our data
type Profile = {
  id: string
  username: string
  license_plate: string
  bio: string | null
  avatar_url: string | null
  email: string
  created_at: string
  [key: string]: any
}

type Post = {
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

type LicensePlate = {
  id: string
  license_plate: string
  is_primary: boolean
  created_at: string
}

type UserData = {
  profile: Profile | null
  additionalLicensePlates: LicensePlate[]
  posts: Post[]
  comments: Comment[]
  likes: Like[]
  conversations: Conversation[]
  messages: Message[]
}

const DataExportScreen: React.FC = () => {
  const navigation = useNavigation()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"html" | "json">("html")

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const generateHtmlReport = (userData: UserData): string => {
    const profile = userData.profile || { username: "Unbekannt", license_plate: "", email: "", created_at: "" }

    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plated - Datenauskunft für ${profile.username}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        h1, h2, h3 {
          color: #6200ee;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 10px;
          border-bottom: 2px solid #6200ee;
        }
        .section {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .section-icon {
          width: 30px;
          height: 30px;
          margin-right: 10px;
          background-color: #e6e0ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .section-icon svg {
          width: 18px;
          height: 18px;
          fill: #6200ee;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        .item {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 500;
        }
        .item-date {
          color: #666;
          font-size: 0.9em;
        }
        .item-content {
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          color: #666;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <h1>Plated - Datenauskunft</h1>
      
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h2>Profil</h2>
        </div>
        <table>
          <tr>
            <th>Benutzername</th>
            <td>${profile.username}</td>
          </tr>
          <tr>
            <th>E-Mail</th>
            <td>${profile.email || "Nicht angegeben"}</td>
          </tr>
          <tr>
            <th>Kennzeichen</th>
            <td>${profile.license_plate}</td>
          </tr>
          <tr>
            <th>Bio</th>
            <td>${profile.bio ?? "Nicht angegeben"}</td>
          </tr>
          <tr>
            <th>Registriert am</th>
            <td>${formatDate(profile.created_at)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h2>Zusätzliche Kennzeichen</h2>
        </div>
        ${
          userData.additionalLicensePlates && userData.additionalLicensePlates.length > 0
            ? `<table>
                <tr>
                  <th>Kennzeichen</th>
                  <th>Hinzugefügt am</th>
                </tr>
                ${userData.additionalLicensePlates
                  .map(
                    (plate) => `
                <tr>
                  <td>${plate.license_plate}</td>
                  <td>${formatDate(plate.created_at)}</td>
                </tr>
                `,
                  )
                  .join("")}
              </table>`
            : "<p>Keine zusätzlichen Kennzeichen vorhanden.</p>"
        }
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </div>
          <h2>Beiträge (${userData.posts.length})</h2>
        </div>
        ${
          userData.posts && userData.posts.length > 0
            ? userData.posts
                .map(
                  (post) => `
          <div class="item">
            <div class="item-header">
              <span>Beitrag ID: ${post.id}</span>
              <span class="item-date">${formatDate(post.created_at)}</span>
            </div>
            <div class="item-content">
              ${post.content}
            </div>
          </div>
        `,
                )
                .join("")
            : "<p>Keine Beiträge vorhanden.</p>"
        }
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h2>Kommentare (${userData.comments.length})</h2>
        </div>
        ${
          userData.comments && userData.comments.length > 0
            ? userData.comments
                .map(
                  (comment) => `
          <div class="item">
            <div class="item-header">
              <span>Kommentar zu Beitrag: ${comment.post_id}</span>
              <span class="item-date">${formatDate(comment.created_at)}</span>
            </div>
            <div class="item-content">
              ${comment.content}
            </div>
          </div>
        `,
                )
                .join("")
            : "<p>Keine Kommentare vorhanden.</p>"
        }
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <h2>Likes (${userData.likes.length})</h2>
        </div>
        ${
          userData.likes && userData.likes.length > 0
            ? `<table>
                <tr>
                  <th>Beitrag ID</th>
                  <th>Geliked am</th>
                </tr>
                ${userData.likes
                  .map(
                    (like) => `
                <tr>
                  <td>${like.post_id}</td>
                  <td>${formatDate(like.created_at)}</td>
                </tr>
                `,
                  )
                  .join("")}
              </table>`
            : "<p>Keine Likes vorhanden.</p>"
        }
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h2>Nachrichten (${userData.messages.length})</h2>
        </div>
        ${
          userData.messages && userData.messages.length > 0
            ? userData.messages
                .map(
                  (message) => `
          <div class="item">
            <div class="item-header">
              <span>Konversation: ${message.conversation_id}</span>
              <span class="item-date">${formatDate(message.created_at)}</span>
            </div>
            <div class="item-content">
              ${message.content}
            </div>
          </div>
        `,
                )
                .join("")
            : "<p>Keine Nachrichten vorhanden.</p>"
        }
      </div>

      <div class="footer">
        <p>Diese Datenauskunft wurde am ${new Date().toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })} erstellt.</p>
        <p>Plated App - Deine Daten, deine Kontrolle</p>
      </div>
    </body>
    </html>
    `
  }

  const handleExport = async () => {
    if (!user) {
      Alert.alert("Fehler", "Du musst angemeldet sein, um deine Daten zu exportieren.")
      return
    }

    try {
      setIsExporting(true)

      // Sammle alle Benutzerdaten
      const userData: UserData = {
        profile: null,
        additionalLicensePlates: [],
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

      // Zusätzliche Kennzeichen abrufen
      const { data: licensePlatesData, error: licensePlatesError } = await supabase
        .from("additional_license_plates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (licensePlatesError) throw licensePlatesError
      userData.additionalLicensePlates = licensePlatesData || []

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

      // Daten als Datei speichern
      let fileContent: string
      let fileName: string
      let mimeType: string

      if (exportFormat === "html") {
        fileContent = generateHtmlReport(userData)
        fileName = `plated_datenauskunft_${new Date().toISOString().split("T")[0]}.html`
        mimeType = "text/html"
      } else {
        fileContent = JSON.stringify(userData, null, 2)
        fileName = `plated_datenauskunft_${new Date().toISOString().split("T")[0]}.json`
        mimeType = "application/json"
      }

      const filePath = `${FileSystem.documentDirectory}${fileName}`
      await FileSystem.writeAsStringAsync(filePath, fileContent)

      // Datei teilen
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: mimeType,
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

      Alert.alert("Erfolg", "Deine Daten wurden erfolgreich exportiert.")
    } catch (error) {
      console.error("Fehler beim Exportieren der Daten:", error)
      Alert.alert(
        "Fehler",
        "Beim Exportieren deiner Daten ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="m"
        style={{ paddingTop: Platform.OS === "ios" ? 10 : STATUSBAR_HEIGHT + 10, paddingBottom: 10 }}
        backgroundColor="cardBackground"
      >
        <Button
          title="Zurück"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="small"
          icon={<ArrowLeft size={20} color={theme.colors.primary} />}
        />
        <Text variant="subtitle" fontWeight="bold" style={{ flex: 1, textAlign: "center" }}>
          Datenauskunft
        </Text>
        <Box width={50} />
      </Box>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Box padding="m">
          <Card variant="elevated" style={styles.card}>
            <Box
              flexDirection="row"
              alignItems="center"
              backgroundColor="primaryLight"
              padding="m"
              borderRadius="m"
              marginBottom="m"
            >
              <Shield size={24} color={theme.colors.primary} style={{ marginRight: 12 }} />
              <Text variant="subtitle" fontWeight="bold">
                Deine Daten, deine Kontrolle
              </Text>
            </Box>

            <Text variant="body" marginBottom="m">
              Gemäß der Datenschutz-Grundverordnung (DSGVO) hast du das Recht, eine Kopie aller personenbezogenen Daten
              anzufordern, die wir über dich gespeichert haben.
            </Text>

            <Box marginBottom="l">
              <Text variant="subtitle" fontWeight="600" marginBottom="s">
                Der Export enthält:
              </Text>

              <Box flexDirection="row" alignItems="center" marginBottom="s">
                <User size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="body">Deine Profilinformationen</Text>
              </Box>

              <Box flexDirection="row" alignItems="center" marginBottom="s">
                <Car size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="body">Deine Kennzeichen</Text>
              </Box>

              <Box flexDirection="row" alignItems="center" marginBottom="s">
                <MessageSquare size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="body">Deine Beiträge und Kommentare</Text>
              </Box>

              <Box flexDirection="row" alignItems="center" marginBottom="s">
                <ThumbsUp size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="body">Deine Likes und Interaktionen</Text>
              </Box>

              <Box flexDirection="row" alignItems="center">
                <MessageSquare size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="body">Deine Nachrichten und Konversationen</Text>
              </Box>
            </Box>

            <Box marginBottom="l">
              <Text variant="subtitle" fontWeight="600" marginBottom="s">
                Exportformat wählen:
              </Text>

              <Box flexDirection="row" marginBottom="m">
                <TouchableOpacity
                  style={[
                    styles.formatOption,
                    {
                      backgroundColor: exportFormat === "html" ? theme.colors.primaryLight : "transparent",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setExportFormat("html")}
                >
                  <FileText
                    size={24}
                    color={exportFormat === "html" ? theme.colors.primary : theme.colors.secondaryText}
                    style={{ marginBottom: 8 }}
                  />
                  <Text
                    variant="body"
                    fontWeight={exportFormat === "html" ? "600" : "normal"}
                    color={exportFormat === "html" ? "primary" : "secondaryText"}
                  >
                    HTML-Bericht
                  </Text>
                  <Text variant="small" color="secondaryText" textAlign="center" marginTop="xs">
                    Benutzerfreundlich
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatOption,
                    {
                      backgroundColor: exportFormat === "json" ? theme.colors.primaryLight : "transparent",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setExportFormat("json")}
                >
                  <FileText
                    size={24}
                    color={exportFormat === "json" ? theme.colors.primary : theme.colors.secondaryText}
                    style={{ marginBottom: 8 }}
                  />
                  <Text
                    variant="body"
                    fontWeight={exportFormat === "json" ? "600" : "normal"}
                    color={exportFormat === "json" ? "primary" : "secondaryText"}
                  >
                    JSON-Datei
                  </Text>
                  <Text variant="small" color="secondaryText" textAlign="center" marginTop="xs">
                    Maschinenlesbar
                  </Text>
                </TouchableOpacity>
              </Box>
            </Box>

            <Button
              title={isExporting ? "Exportiere Daten..." : "Daten exportieren"}
              onPress={handleExport}
              variant="primary"
              size="large"
              disabled={isExporting}
              icon={
                isExporting ? <ActivityIndicator size="small" color="white" /> : <Download size={20} color="white" />
              }
            />
          </Card>
        </Box>
      </ScrollView>
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
  card: {
    padding: 16,
    width: "100%",
  },
  formatOption: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
})

export default DataExportScreen
