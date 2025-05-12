"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  FlatList,
  Alert,
  Dimensions,
  Keyboard,
  TouchableOpacity,
  TextInput as RNTextInput,
  View,
  TouchableWithoutFeedback,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../../navigation"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Card from "../../components/ui/Card"
import { MessageSquare, User, AlertCircle, Clock, Trash2, X, Info, Car, MapPin, Star } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { StatusBar } from "expo-status-bar"
import { LinearGradient } from "expo-linear-gradient"
import Shimmer from "../../components/ui/Shimmer"
import AnimatedPressable from "../../components/ui/AnimatedPressable"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

type UserResult = {
  id: string
  username: string
  license_plate: string
}

type SearchHistoryItem = {
  query: string
  timestamp: number
}

// Korrigierter Typ für die Ergebnisse der zusätzlichen Kennzeichensuche
type AdditionalLicensePlateResult = {
  user_id: string
  license_plate: string
  profiles: {
    id: string
    username: string
    license_plate: string
  }
}

const { width } = Dimensions.get("window")
const isTablet = width >= 768

const SEARCH_HISTORY_KEY = "license_plate_search_history"
const MAX_HISTORY_ITEMS = 10

// Friendly messages with emojis
const FRIENDLY_MESSAGES = [
  "Finde neue Fahrer in deiner Nähe! 🚗 👋",
  "Jemand hat dich im Verkehr beeindruckt? Finde sie hier! ✨ 🛣️",
  "Verbinde dich mit anderen Autofahrern! 🤝 🚘",
  "Neue Kontakte auf der Straße knüpfen! 🌟 🚦",
  "Kennzeichen gesehen? Sag Hallo! 👀 📝",
  "Gemeinsam unterwegs, gemeinsam vernetzt! 🚙",
  "Entdecke die Community auf der Straße! 🔍 🚗",
  "Mach aus Verkehrsteilnehmern Freunde! 😊 🚘",
  "Straßenbekanntschaften leicht gemacht! 🛣️ 💬",
  "Finde den Fahrer hinter dem Kennzeichen! 🕵️‍♂️ 🚗",
]

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>()
  const { isAuthenticated, isEmailVerified } = useAuth()
  const { theme, isDarkMode } = useTheme()
  const insets = useSafeAreaInsets()

  // License plate input refs
  const licensePart1Ref = useRef<RNTextInput>(null)
  const licensePart2Ref = useRef<RNTextInput>(null)
  const licensePart3Ref = useRef<RNTextInput>(null)

  const [licensePart1, setLicensePart1] = useState("")
  const [licensePart2, setLicensePart2] = useState("")
  const [licensePart3, setLicensePart3] = useState("")

  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [friendlyMessage, setFriendlyMessage] = useState("")

  // Debounce timer for auto-search
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load search history on component mount and select random friendly message
  useEffect(() => {
    loadSearchHistory()
    setFriendlyMessage(FRIENDLY_MESSAGES[Math.floor(Math.random() * FRIENDLY_MESSAGES.length)])
  }, [])

  // Auto-search when license plate is valid
  useEffect(() => {
    // Clear any existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    // Check if we have a valid license plate
    if (isValidGermanLicensePlate()) {
      // Set a new timer to trigger search after a short delay
      searchTimerRef.current = setTimeout(() => {
        handleSearch()
      }, 500) // 500ms delay to avoid too many searches while typing
    }

    // Cleanup function
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [licensePart1, licensePart2, licensePart3])

  const loadSearchHistory = async () => {
    try {
      const historyString = await AsyncStorage.getItem(SEARCH_HISTORY_KEY)
      if (historyString) {
        const history = JSON.parse(historyString) as SearchHistoryItem[]
        setSearchHistory(history)
      }
    } catch (error) {
      console.error("Error loading search history:", error)
    }
  }

  const saveSearchHistory = async (history: SearchHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error("Error saving search history:", error)
    }
  }

  const addToSearchHistory = (query: string) => {
    const newItem: SearchHistoryItem = {
      query,
      timestamp: Date.now(),
    }

    // Remove if exists already to avoid duplicates
    const filteredHistory = searchHistory.filter((item) => item.query !== query)

    // Add new item at the beginning and limit to MAX_HISTORY_ITEMS
    const newHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS)

    setSearchHistory(newHistory)
    saveSearchHistory(newHistory)
  }

  const clearSearchHistory = async () => {
    Alert.alert("Suchverlauf löschen", "Möchtest du deinen gesamten Suchverlauf löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          setSearchHistory([])
          await AsyncStorage.removeItem(SEARCH_HISTORY_KEY)
        },
      },
    ])
  }

  const removeHistoryItem = async (query: string) => {
    const newHistory = searchHistory.filter((item) => item.query !== query)
    setSearchHistory(newHistory)
    saveSearchHistory(newHistory)
  }

  // Formatiere die Eingabe für Teil 1 (nur Buchstaben, max 3)
  const handleLicensePart1Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3)
    setLicensePart1(formatted)

    // Auto-advance to next field when max length is reached
    if (formatted.length === 3) {
      licensePart2Ref.current?.focus()
    }
  }

  // Formatiere die Eingabe für Teil 2 (nur Buchstaben, max 2)
  const handleLicensePart2Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 2)
    setLicensePart2(formatted)

    // Auto-advance to next field when max length is reached
    if (formatted.length === 2) {
      licensePart3Ref.current?.focus()
    }
  }

  // Formatiere die Eingabe für Teil 3 (nur Zahlen, max 4)
  const handleLicensePart3Change = (text: string) => {
    const formatted = text.replace(/[^0-9]/g, "").slice(0, 4)
    setLicensePart3(formatted)
  }

  // Vollständiges Kennzeichen mit Bindestrichen
  const getFullLicensePlate = () => {
    return `${licensePart1}-${licensePart2}-${licensePart3}`
  }

  // Validierung für deutsches Kennzeichen
  const isValidGermanLicensePlate = () => {
    // Erste Gruppe: 1-3 Buchstaben
    const isValidPart1 = /^[A-Z]{1,3}$/.test(licensePart1)
    // Zweite Gruppe: 1-2 Buchstaben
    const isValidPart2 = /^[A-Z]{1,2}$/.test(licensePart2)
    // Dritte Gruppe: 1-4 Ziffern
    const isValidPart3 = /^[0-9]{1,4}$/.test(licensePart3)

    return isValidPart1 && isValidPart2 && isValidPart3
  }

  const clearLicensePlateInput = () => {
    setLicensePart1("")
    setLicensePart2("")
    setLicensePart3("")
    licensePart1Ref.current?.focus()
  }

  const handleSearch = async () => {
    if (!isValidGermanLicensePlate()) {
      return
    }

    const fullLicensePlate = getFullLicensePlate()
    setLoading(true)
    setShowHistory(false)

    try {
      // Suche nach Hauptkennzeichen in der profiles-Tabelle
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, license_plate")
        .ilike("license_plate", fullLicensePlate)

      if (profilesError) {
        throw profilesError
      }

      // Suche nach zusätzlichen Kennzeichen in der additional_license_plates-Tabelle
      // und verknüpfe mit den Profildaten
      const additionalResponse = await supabase
        .from("additional_license_plates")
        .select("user_id, license_plate, profiles!inner(id, username, license_plate)")
        .ilike("license_plate", fullLicensePlate)

      const additionalData = additionalResponse.data || []
      const additionalError = additionalResponse.error

      if (additionalError) {
        throw additionalError
      }

      // Konvertiere die zusätzlichen Kennzeichen-Ergebnisse in das gleiche Format wie die Hauptkennzeichen
      const formattedAdditionalData = additionalData.map((item: any) => ({
        id: item.user_id,
        username: item.profiles.username,
        license_plate: item.license_plate, // Zeige das gefundene zusätzliche Kennzeichen an
      }))

      // Kombiniere die Ergebnisse und entferne Duplikate basierend auf der ID
      const combinedResults = [...profilesData, ...formattedAdditionalData]
      const uniqueResults = Array.from(new Map(combinedResults.map((item) => [item.id, item])).values())

      setSearchResults(uniqueResults || [])
      setSearched(true)

      // Add to search history
      addToSearchHistory(fullLicensePlate)

      // Get a new friendly message
      setFriendlyMessage(FRIENDLY_MESSAGES[Math.floor(Math.random() * FRIENDLY_MESSAGES.length)])
    } catch (error) {
      console.error("Fehler bei der Suche:", error)
      Alert.alert("Fehler", "Bei der Suche ist ein Fehler aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  const handleMessage = (userId: string, username: string) => {
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

    navigation.navigate("Conversation", { userId, username })
  }

  const handleHistoryItemPress = (query: string) => {
    // Parse the license plate parts from the query
    const parts = query.split("-")
    if (parts.length === 3) {
      setLicensePart1(parts[0])
      setLicensePart2(parts[1])
      setLicensePart3(parts[2])
    }
  }

  const toggleHistoryView = () => {
    setShowHistory(!showHistory)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()

    // Today
    if (date.toDateString() === now.toDateString()) {
      return `Heute, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Gestern, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    }

    // Other days
    return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  const renderResultItem = ({ item }: { item: UserResult }) => (
    <AnimatedPressable>
      <Card
        variant="default"
        padding="medium"
        style={[styles.resultCard, isTablet && styles.tabletCard, { backgroundColor: theme.colors.cardBackground }]}
      >
        <Box style={styles.resultCardContent}>
          {/* User info section */}
          <Box style={styles.userInfoSection}>
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Box style={styles.avatarInner} backgroundColor="cardBackground">
                <User size={28} color={theme.colors.primary} />
              </Box>
            </LinearGradient>

            <Box marginLeft="m">
              <Text variant="subtitle" style={styles.username}>
                {item.username}
              </Text>

              <Box flexDirection="row" alignItems="center" marginTop="xs">
                <Car size={14} color={theme.colors.primary} />
                <Text variant="caption" color="secondaryText" marginLeft="xs" style={styles.licensePlate}>
                  {item.license_plate}
                </Text>
              </Box>

              <Box flexDirection="row" marginTop="s">
                <Box style={styles.userTag} backgroundColor="primaryLight">
                  <Star size={12} color={theme.colors.primary} />
                  <Text variant="small" color="primary" marginLeft="xs" style={styles.tagText}>
                    Fahrer
                  </Text>
                </Box>

                <Box style={styles.userTag} backgroundColor="primaryLight" marginLeft="s">
                  <MapPin size={12} color={theme.colors.primary} />
                  <Text variant="small" color="primary" marginLeft="xs" style={styles.tagText}>
                    Aktiv
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Action button */}
          <TouchableOpacity
            style={styles.messageButtonContainer}
            onPress={() => handleMessage(item.id, item.username)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.messageButton}
            >
              <MessageSquare size={18} color="white" />
              <Text variant="small" color="buttonText" marginLeft="xs" fontWeight="600">
                Nachricht senden
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Box>
      </Card>
    </AnimatedPressable>
  )

  const renderEmptyResults = () => {
    if (!searched) return null

    return (
      <Box alignItems="center" padding="l">
        <Box
          width={80}
          height={80}
          borderRadius="full"
          backgroundColor="primaryLight"
          justifyContent="center"
          alignItems="center"
          marginBottom="l"
        >
          <AlertCircle size={40} color={theme.colors.primary} />
        </Box>
        <Text variant="subtitle" textAlign="center" marginBottom="m">
          Keine Ergebnisse gefunden
        </Text>
        <Text variant="body" textAlign="center" color="secondaryText">
          Es wurden keine Benutzer mit dem Kennzeichen "{getFullLicensePlate()}" gefunden.
        </Text>
      </Box>
    )
  }

  const renderHistoryItem = ({ item }: { item: SearchHistoryItem }) => (
    <Box
      backgroundColor="surfaceBackground"
      borderRadius="m"
      marginBottom="s"
      style={[styles.historyItem, { backgroundColor: theme.colors.surfaceBackground }]}
    >
      <TouchableOpacity style={styles.historyItemContent} onPress={() => handleHistoryItemPress(item.query)}>
        <Box flexDirection="row" alignItems="center" flex={1}>
          <Clock size={16} color={theme.colors.secondaryText} />
          <Box marginLeft="s" flex={1}>
            <Text variant="body" fontWeight="500">
              {item.query}
            </Text>
            <Text variant="small" color="secondaryText">
              {formatDate(item.timestamp)}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyItemDelete} onPress={() => removeHistoryItem(item.query)}>
        <X size={16} color={theme.colors.error} />
      </TouchableOpacity>
    </Box>
  )

  const renderSearchHistory = () => {
    if (!showHistory || searchHistory.length === 0) return null

    return (
      <Box style={[styles.historyContainer, { backgroundColor: theme.colors.cardBackground }]}>
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
          <Text variant="subtitle">Suchverlauf</Text>
          <TouchableOpacity onPress={clearSearchHistory}>
            <Box flexDirection="row" alignItems="center">
              <Trash2 size={16} color={theme.colors.error} />
              <Text variant="small" color="error" marginLeft="xs">
                Löschen
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>

        <FlatList
          data={searchHistory}
          keyExtractor={(item) => item.query + item.timestamp}
          renderItem={renderHistoryItem}
          showsVerticalScrollIndicator={false}
          style={styles.historyList}
        />
      </Box>
    )
  }

  const renderHistoryButton = () => {
    if (searchHistory.length === 0) return null

    return (
      <TouchableOpacity
        style={[styles.historyButton, { backgroundColor: theme.colors.surfaceBackground }]}
        onPress={toggleHistoryView}
      >
        <Clock size={16} color={theme.colors.secondaryText} />
        <Text variant="small" marginLeft="xs">
          {showHistory ? "Verlauf ausblenden" : "Suchverlauf anzeigen"}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderLoadingResults = () => {
    if (!loading) return null

    return (
      <Box width="100%" padding="m">
        {[1, 2, 3].map((i) => (
          <Box
            key={i}
            marginBottom="m"
            padding="m"
            borderRadius="m"
            style={[styles.shimmerCard, { backgroundColor: theme.colors.cardBackground }]}
          >
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Box flexDirection="row" alignItems="center">
                <Shimmer width={60} height={60} borderRadius={30} style={{ marginRight: 16 }} />
                <Box>
                  <Shimmer width={120} height={18} style={{ marginBottom: 8 }} />
                  <Shimmer width={80} height={14} style={{ marginBottom: 8 }} />
                  <Shimmer width={140} height={24} borderRadius={12} />
                </Box>
              </Box>
              <Shimmer width={140} height={44} borderRadius={22} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  const renderInfoCard = () => {
    if (searched || loading || showHistory) return null

    return (
      <Box
        padding="l"
        borderRadius="l"
        marginTop="l"
        style={[styles.infoCard, { backgroundColor: theme.colors.cardBackground }]}
      >
        <Box
          width={60}
          height={60}
          borderRadius="full"
          backgroundColor="primaryLight"
          justifyContent="center"
          alignItems="center"
          marginBottom="m"
          alignSelf="center"
        >
          <Info size={30} color={theme.colors.primary} />
        </Box>

        <Text variant="subtitle" textAlign="center" marginBottom="m">
          Wie funktioniert die Kennzeichensuche?
        </Text>

        <Box marginBottom="m">
          <Text variant="body" marginBottom="s">
            1. Gib ein deutsches Kennzeichen ein (z.B. M-AB-123)
          </Text>
          <Text variant="body" marginBottom="s">
            2. Die Suche startet automatisch
          </Text>
          <Text variant="body">3. Finde den Fahrer und sende eine Nachricht</Text>
        </Box>

        <Text variant="small" color="secondaryText" textAlign="center">
          Hinweis: Du musst angemeldet sein, um Nachrichten zu senden.
        </Text>
      </Box>
    )
  }

  const renderFriendlyMessage = () => {
    return (
      <Box style={[styles.friendlyMessageContainer, { backgroundColor: theme.colors.primaryLight }]}>
        <Text variant="body" color="primary" textAlign="center" style={styles.friendlyMessageText}>
          {friendlyMessage}
        </Text>
      </Box>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Box
        flex={1}
        backgroundColor="mainBackground"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <StatusBar style={isDarkMode ? "light" : "dark"} />

        <Box padding="m" paddingBottom="s" flex={1}>
          <Text variant="title">Kennzeichen suchen</Text>
          <Text variant="caption" color="secondaryText" marginBottom="m">
            Finde andere Fahrer anhand ihres Kennzeichens
          </Text>

          {renderFriendlyMessage()}

          {/* Smaller License Plate Input */}
          <Box style={[styles.searchBarContainer, isTablet && styles.tabletSearchContainer]}>
            <Box style={[styles.searchInputContainer, { backgroundColor: theme.colors.cardBackground }]}>
              <View style={styles.iconContainer}>
                <Car size={18} color={theme.colors.secondaryText} />
              </View>

              <View style={styles.licenseContainer}>
                <RNTextInput
                  ref={licensePart1Ref}
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 50 }]}
                  placeholder="HH"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart1}
                  onChangeText={handleLicensePart1Change}
                  autoCapitalize="characters"
                  maxLength={3}
                />
                <Text variant="body" style={styles.licenseSeparator}>
                  -
                </Text>
                <RNTextInput
                  ref={licensePart2Ref}
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 35 }]}
                  placeholder="OZ"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart2}
                  onChangeText={handleLicensePart2Change}
                  autoCapitalize="characters"
                  maxLength={2}
                />
                <Text variant="body" style={styles.licenseSeparator}>
                  -
                </Text>
                <RNTextInput
                  ref={licensePart3Ref}
                  style={[styles.licenseInput, { color: theme.colors.primaryText, width: 60 }]}
                  placeholder="1997"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={licensePart3}
                  onChangeText={handleLicensePart3Change}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              {(licensePart1 || licensePart2 || licensePart3) && (
                <TouchableOpacity onPress={clearLicensePlateInput} style={styles.clearButton}>
                  <Box style={styles.clearButtonInner} backgroundColor="surfaceBackground">
                    <X size={14} color={theme.colors.secondaryText} />
                  </Box>
                </TouchableOpacity>
              )}
            </Box>
          </Box>

          {renderHistoryButton()}
          {renderSearchHistory()}
          {renderInfoCard()}

          {loading ? (
            renderLoadingResults()
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderResultItem}
              ListEmptyComponent={renderEmptyResults}
              contentContainerStyle={[
                styles.listContent,
                searchResults.length === 0 && searched && styles.emptyListContent,
                isTablet && styles.tabletListContent,
              ]}
            />
          )}
        </Box>
      </Box>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  tabletListContent: {
    alignSelf: "center",
    maxWidth: 800,
    width: "100%",
  },
  resultCard: {
    marginVertical: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderRadius: 16,
    overflow: "hidden",
  },
  resultCardContent: {
    padding: 4,
  },
  tabletCard: {
    marginHorizontal: 0,
  },
  userInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
  },
  licensePlate: {
    fontSize: 14,
  },
  userTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  messageButtonContainer: {
    alignSelf: "stretch",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  tabletSearchContainer: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  historyContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  historyItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  historyItemDelete: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  shimmerCard: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoCard: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 12,
    width: "100%",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    height: 48, // Reduced height
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    marginLeft: 10,
    marginRight: 8,
  },
  licenseContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  licenseInput: {
    height: 40, // Reduced height
    fontSize: 15, // Smaller font
    textAlign: "center",
    padding: 0, // Remove padding to save space
  },
  licenseSeparator: {
    fontSize: 18, // Smaller separator
    fontWeight: "bold",
    marginHorizontal: 4, // Reduced margin
  },
  clearButton: {
    padding: 6,
    marginRight: 6,
  },
  clearButtonInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  friendlyMessageContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  friendlyMessageText: {
    fontWeight: "500",
  },
})

export default SearchScreen
