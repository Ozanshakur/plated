"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  View,
  Alert,
  FlatList,
  TextInput as RNTextInput,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import Button from "../../components/ui/Button"
import TextInput from "../../components/ui/TextInput"
import {
  User,
  ArrowLeft,
  Check,
  Edit3,
  MessageSquare,
  MapPin,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Info,
  Car,
} from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { SafeAreaView } from "react-native-safe-area-context"
import { validateLicensePlate } from "../../utils/license-plate-utils"
import { LinearGradient } from "expo-linear-gradient"

type UserProfile = {
  username: string
  license_plate: string
  bio: string | null
  avatar_url: string | null
  last_username_change: string | null
}

type LicensePlate = {
  id: string
  license_plate: string
  is_primary: boolean
  created_at: string
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation()
  const { user, refreshUser } = useAuth()
  const { theme, isDarkMode } = useTheme()

  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    license_plate: "",
    bio: "",
    avatar_url: null,
    last_username_change: null,
  })
  const [originalUsername, setOriginalUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [usernameChangeAllowed, setUsernameChangeAllowed] = useState(true)
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // License plates state
  const [additionalLicensePlates, setAdditionalLicensePlates] = useState<LicensePlate[]>([])
  const [showAddLicensePlateModal, setShowAddLicensePlateModal] = useState(false)
  const [licensePlateError, setLicensePlateError] = useState("")
  const [addingLicensePlate, setAddingLicensePlate] = useState(false)

  // Multi-part license plate input
  const [licensePart1, setLicensePart1] = useState("")
  const [licensePart2, setLicensePart2] = useState("")
  const [licensePart3, setLicensePart3] = useState("")

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(50))
  const [successAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    fetchProfile()
    fetchAdditionalLicensePlates()

    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [user])

  // Track changes to determine if save button should be enabled
  useEffect(() => {
    if (!loading) {
      setHasChanges(true)
    }
  }, [profile])

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("profiles")
        .select("username, license_plate, bio, avatar_url, last_username_change")
        .eq("id", user.id)
        .single()

      if (error) {
        throw error
      }

      setProfile({
        username: data.username || "",
        license_plate: data.license_plate || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url,
        last_username_change: data.last_username_change,
      })
      setOriginalUsername(data.username || "")

      // Check if username change is allowed
      checkUsernameChangeAllowed(data.last_username_change)

      // Reset changes tracking after loading initial data
      setHasChanges(false)
    } catch (error) {
      console.error("Error loading profile:", error)
      showCustomAlert("Fehler", "Profildaten konnten nicht geladen werden. Bitte versuche es erneut.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAdditionalLicensePlates = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("additional_license_plates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (error) throw error
      setAdditionalLicensePlates(data || [])
    } catch (error) {
      console.error("Error loading additional license plates:", error)
    }
  }

  const checkUsernameChangeAllowed = (lastChangeDate: string | null) => {
    if (!lastChangeDate) {
      setUsernameChangeAllowed(true)
      return
    }

    const lastChange = new Date(lastChangeDate)
    const now = new Date()
    const diffTime = now.getTime() - lastChange.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 7) {
      setUsernameChangeAllowed(false)
      setDaysUntilUsernameChange(7 - diffDays)
    } else {
      setUsernameChangeAllowed(true)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!profile.username.trim()) {
      newErrors.username = "Benutzername ist erforderlich"
    } else if (profile.username.length < 3) {
      newErrors.username = "Benutzername muss mindestens 3 Zeichen lang sein"
    }

    if (!profile.license_plate.trim()) {
      newErrors.license_plate = "Kennzeichen ist erforderlich"
    } else if (!validateLicensePlate(profile.license_plate)) {
      newErrors.license_plate = "Ungültiges Kennzeichenformat"
    }

    if (profile.bio && profile.bio.length > 150) {
      newErrors.bio = "Bio darf maximal 150 Zeichen lang sein"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showCustomAlert = (title: string, message: string) => {
    // Custom alert implementation
    // For now, we'll just use the native Alert
    // In a real app, you would implement a custom modal here
    setShowSuccessModal(true)

    // Auto-hide after 2 seconds
    setTimeout(() => {
      setShowSuccessModal(false)
      navigation.goBack()
    }, 2000)
  }

  const handleSave = async () => {
    if (!user) return

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      // Prepare update data
      const updateData: any = {
        license_plate: profile.license_plate.trim(),
        bio: profile.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      }

      // Only update username if it's allowed and has changed
      if (usernameChangeAllowed && profile.username.trim() !== originalUsername) {
        updateData.username = profile.username.trim()
        updateData.last_username_change = new Date().toISOString()
      } else {
        // Keep original username
        updateData.username = originalUsername
      }

      // Update profile in database
      const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id)

      if (error) throw error

      // Refresh user data in auth context
      await refreshUser()

      // Show success message
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      showCustomAlert("Erfolg", "Profil erfolgreich aktualisiert")
      setHasChanges(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      showCustomAlert("Fehler", "Profil konnte nicht aktualisiert werden. Bitte versuche es erneut.")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))

    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Formatiere die Eingabe für Teil 1 (nur Buchstaben, max 3)
  const handleLicensePart1Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3)
    setLicensePart1(formatted)
    setLicensePlateError("")
  }

  // Formatiere die Eingabe für Teil 2 (nur Buchstaben, max 2)
  const handleLicensePart2Change = (text: string) => {
    const formatted = text
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 2)
    setLicensePart2(formatted)
    setLicensePlateError("")
  }

  // Formatiere die Eingabe für Teil 3 (nur Zahlen, max 4)
  const handleLicensePart3Change = (text: string) => {
    const formatted = text.replace(/[^0-9]/g, "").slice(0, 4)
    setLicensePart3(formatted)
    setLicensePlateError("")
  }

  // Vollständiges Kennzeichen mit Bindestrichen
  const getFullLicensePlate = () => {
    return `${licensePart1}-${licensePart2}-${licensePart3}`
  }

  // Validiere deutsches Kennzeichen
  const isValidGermanLicensePlate = () => {
    // Erste Gruppe: 1-3 Buchstaben
    const isValidPart1 = /^[A-Z]{1,3}$/.test(licensePart1)
    // Zweite Gruppe: 1-2 Buchstaben
    const isValidPart2 = /^[A-Z]{1,2}$/.test(licensePart2)
    // Dritte Gruppe: 1-4 Ziffern
    const isValidPart3 = /^[0-9]{1,4}$/.test(licensePart3)

    return isValidPart1 && isValidPart2 && isValidPart3
  }

  const handleAddLicensePlate = async () => {
    if (!user) return

    // Validate license plate
    if (!isValidGermanLicensePlate()) {
      setLicensePlateError("Ungültiges Kennzeichenformat")
      return
    }

    const fullLicensePlate = getFullLicensePlate()

    // Check if license plate already exists
    const existsInProfile = profile.license_plate === fullLicensePlate
    const existsInAdditional = additionalLicensePlates.some((plate) => plate.license_plate === fullLicensePlate)

    if (existsInProfile || existsInAdditional) {
      setLicensePlateError("Dieses Kennzeichen ist bereits registriert")
      return
    }

    try {
      setAddingLicensePlate(true)

      // Check if license plate is available using the database function
      const { data: isAvailable, error: checkError } = await supabase.rpc("is_license_plate_available", {
        plate: fullLicensePlate,
      })

      if (checkError) throw checkError

      if (!isAvailable) {
        setLicensePlateError("Dieses Kennzeichen wird bereits von einem anderen Benutzer verwendet")
        return
      }

      // Add license plate to database
      const { data, error } = await supabase
        .from("additional_license_plates")
        .insert({
          user_id: user.id,
          license_plate: fullLicensePlate,
          is_primary: false,
        })
        .select()

      if (error) throw error

      // Refresh license plates
      await fetchAdditionalLicensePlates()

      // Close modal and reset form
      setShowAddLicensePlateModal(false)
      setLicensePart1("")
      setLicensePart2("")
      setLicensePart3("")
      setLicensePlateError("")
    } catch (error) {
      console.error("Error adding license plate:", error)
      Alert.alert("Fehler", "Kennzeichen konnte nicht hinzugefügt werden. Bitte versuche es erneut.")
    } finally {
      setAddingLicensePlate(false)
    }
  }

  const handleDeleteLicensePlate = async (plateId: string) => {
    if (!user) return

    Alert.alert("Kennzeichen löschen", "Möchtest du dieses Kennzeichen wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("additional_license_plates")
              .delete()
              .eq("id", plateId)
              .eq("user_id", user.id)

            if (error) throw error

            // Refresh license plates
            await fetchAdditionalLicensePlates()
          } catch (error) {
            console.error("Error deleting license plate:", error)
            Alert.alert("Fehler", "Kennzeichen konnte nicht gelöscht werden. Bitte versuche es erneut.")
          }
        },
      },
    ])
  }

  const handleSetPrimaryLicensePlate = async (plateId: string, licensePlate: string) => {
    if (!user) return

    try {
      // First update the profile's primary license plate
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ license_plate: licensePlate })
        .eq("id", user.id)

      if (profileError) throw profileError

      // Update local state
      setProfile((prev) => ({ ...prev, license_plate: licensePlate }))

      // Show success message
      Alert.alert("Erfolg", "Primäres Kennzeichen wurde aktualisiert")
    } catch (error) {
      console.error("Error setting primary license plate:", error)
      Alert.alert("Fehler", "Primäres Kennzeichen konnte nicht aktualisiert werden. Bitte versuche es erneut.")
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </Box>
      </SafeAreaView>
    )
  }

  // Calculate bio length safely
  const bioLength = profile.bio ? profile.bio.length : 0
  const isBioNearLimit = bioLength > 130

  const renderLicensePlateItem = ({ item }: { item: LicensePlate }) => {
    const isPrimary = item.license_plate === profile.license_plate

    return (
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={isPrimary ? "primaryLight" : "surfaceBackground"}
        padding="s"
        borderRadius="m"
        marginBottom="s"
      >
        <Box flexDirection="row" alignItems="center" flex={1}>
          <MapPin size={16} color={theme.colors.primary} />
          <Text variant="body" marginLeft="s" fontWeight={isPrimary ? "bold" : "normal"}>
            {item.license_plate}
          </Text>
          {isPrimary && (
            <Box backgroundColor="primary" paddingHorizontal="xs" paddingVertical="xs" borderRadius="s" marginLeft="s">
              <Text variant="small" color="buttonText" fontWeight="bold">
                Primär
              </Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="row">
          {!isPrimary && (
            <TouchableOpacity
              style={styles.licensePlateAction}
              onPress={() => handleSetPrimaryLicensePlate(item.id, item.license_plate)}
            >
              <Check size={18} color={theme.colors.success} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.licensePlateAction} onPress={() => handleDeleteLicensePlate(item.id)}>
            <Trash2 size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </Box>
      </Box>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="m"
          paddingVertical="s"
          backgroundColor="cardBackground"
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>
          <Text variant="subtitle" fontWeight="bold">
            Profil bearbeiten
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={[
              styles.saveButton,
              {
                backgroundColor: saving || !hasChanges ? theme.colors.gray400 : theme.colors.primary,
                opacity: saving || !hasChanges ? 0.7 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Check size={18} color="white" />
                <Text variant="small" style={{ color: "white" }} marginLeft="xs">
                  Speichern
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Box>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative Top Gradient */}
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topGradient}
          />

          {/* Profile Icon with Animation */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Box
              width={140}
              height={140}
              borderRadius="xxl"
              backgroundColor="primaryLight"
              justifyContent="center"
              alignItems="center"
              style={styles.avatarInner}
            >
              <User size={60} color={theme.colors.primary} />
            </Box>
            <Box
              position="absolute"
              bottom={-5}
              right={-5}
              backgroundColor="accent"
              width={40}
              height={40}
              borderRadius="full"
              justifyContent="center"
              alignItems="center"
              style={styles.editIconContainer}
            >
              <Edit3 size={20} color="white" />
            </Box>
          </Animated.View>

          {/* Form Fields with Animation */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Box padding="m" marginTop="l">
              {/* Username Field */}
              <Box
                marginBottom="m"
                backgroundColor="cardBackground"
                padding="m"
                borderRadius="m"
                style={styles.fieldContainer}
              >
                <Box flexDirection="row" alignItems="center" marginBottom="xs" justifyContent="space-between">
                  <Box flexDirection="row" alignItems="center">
                    <User size={18} color={theme.colors.primary} />
                    <Text variant="subtitle" marginLeft="s" fontWeight="600">
                      Benutzername
                    </Text>
                  </Box>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    backgroundColor="primaryLight"
                    paddingHorizontal="s"
                    paddingVertical="xs"
                    borderRadius="s"
                    style={styles.badgeContainer}
                  >
                    <Clock size={14} color={theme.colors.primary} />
                    <Text variant="small" color="primary" marginLeft="xs">
                      Alle 7 Tage änderbar
                    </Text>
                  </Box>
                </Box>
                <TextInput
                  value={profile.username}
                  onChangeText={(text) => handleInputChange("username", text)}
                  placeholder="Dein Benutzername"
                  editable={usernameChangeAllowed}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? "rgba(30,30,30,0.8)" : "rgba(240,240,240,0.8)",
                      borderColor: errors.username
                        ? theme.colors.error
                        : isDarkMode
                          ? "rgba(70,70,70,0.5)"
                          : "rgba(200,200,200,0.5)",
                      opacity: usernameChangeAllowed ? 1 : 0.6,
                    },
                  ]}
                />
                {!usernameChangeAllowed && (
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    marginTop="xs"
                    padding="xs"
                    borderRadius="s"
                    borderLeftWidth={3}
                    borderLeftColor="warning"
                    style={{
                      backgroundColor: isDarkMode ? "rgba(50,50,50,0.8)" : "rgba(245,245,245,0.9)",
                    }}
                  >
                    <Clock size={16} color={theme.colors.warning} />
                    <Text variant="small" marginLeft="xs" style={{ flex: 1 }}>
                      Änderung erst in {daysUntilUsernameChange} Tag{daysUntilUsernameChange !== 1 ? "en" : ""} möglich
                    </Text>
                  </Box>
                )}
                {errors.username && (
                  <Text variant="small" color="error" marginTop="xs">
                    {errors.username}
                  </Text>
                )}
              </Box>

              {/* License Plate Field */}
              <Box
                marginBottom="m"
                backgroundColor="cardBackground"
                padding="m"
                borderRadius="m"
                style={styles.fieldContainer}
              >
                <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="xs">
                  <Box flexDirection="row" alignItems="center">
                    <MapPin size={18} color={theme.colors.primary} />
                    <Text variant="subtitle" marginLeft="s" fontWeight="600">
                      Kennzeichen
                    </Text>
                  </Box>
                  <TouchableOpacity style={styles.addButton} onPress={() => setShowAddLicensePlateModal(true)}>
                    <Plus size={16} color={theme.colors.primary} />
                    <Text variant="small" color="primary" marginLeft="xs">
                      Hinzufügen
                    </Text>
                  </TouchableOpacity>
                </Box>

                {/* Primary license plate */}
                <TextInput
                  value={profile.license_plate}
                  onChangeText={(text) => handleInputChange("license_plate", text)}
                  placeholder="Dein Kennzeichen"
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? "rgba(30,30,30,0.8)" : "rgba(240,240,240,0.8)",
                      borderColor: errors.license_plate
                        ? theme.colors.error
                        : isDarkMode
                          ? "rgba(70,70,70,0.5)"
                          : "rgba(200,200,200,0.5)",
                    },
                  ]}
                  autoCapitalize="characters"
                />
                {errors.license_plate && (
                  <Text variant="small" color="error" marginTop="xs">
                    {errors.license_plate}
                  </Text>
                )}

                {/* Additional license plates */}
                {additionalLicensePlates.length > 0 && (
                  <Box marginTop="m">
                    <Text variant="body" fontWeight="600" marginBottom="xs">
                      Zusätzliche Kennzeichen
                    </Text>
                    <FlatList
                      data={additionalLicensePlates}
                      renderItem={renderLicensePlateItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </Box>
                )}

                <Box
                  flexDirection="row"
                  alignItems="center"
                  marginTop="s"
                  padding="xs"
                  borderRadius="s"
                  borderLeftWidth={3}
                  borderLeftColor="primary"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(50,50,50,0.8)" : "rgba(245,245,245,0.9)",
                  }}
                >
                  <Info size={16} color={theme.colors.primary} />
                  <Text variant="small" marginLeft="xs" style={{ flex: 1 }}>
                    Du kannst mehrere Kennzeichen hinzufügen, um von anderen Nutzern gefunden zu werden.
                  </Text>
                </Box>
              </Box>

              {/* Bio Field */}
              <Box
                marginBottom="l"
                backgroundColor="cardBackground"
                padding="m"
                borderRadius="m"
                style={styles.fieldContainer}
              >
                <Box flexDirection="row" alignItems="center" marginBottom="xs">
                  <MessageSquare size={18} color={theme.colors.primary} />
                  <Text variant="subtitle" marginLeft="s" fontWeight="600">
                    Bio
                  </Text>
                </Box>
                <TextInput
                  value={profile.bio || ""}
                  onChangeText={(text) => handleInputChange("bio", text)}
                  placeholder="Erzähl uns mehr über dich!"
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.bioInput,
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? "rgba(30,30,30,0.8)" : "rgba(240,240,240,0.8)",
                      borderColor: errors.bio
                        ? theme.colors.error
                        : isDarkMode
                          ? "rgba(70,70,70,0.5)"
                          : "rgba(200,200,200,0.5)",
                    },
                  ]}
                />
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginTop="xs">
                  <Text variant="small" color="secondaryText">
                    Kurze Beschreibung über dich
                  </Text>
                  <Text
                    variant="small"
                    color={isBioNearLimit ? "warning" : "secondaryText"}
                    fontWeight={isBioNearLimit ? "bold" : "normal"}
                  >
                    {bioLength}/150
                  </Text>
                </Box>
                {errors.bio && (
                  <Text variant="small" color="error" marginTop="xs">
                    {errors.bio}
                  </Text>
                )}
              </Box>

              <Button
                title="Profil aktualisieren"
                onPress={handleSave}
                variant="primary"
                size="large"
                loading={saving}
                disabled={saving || !hasChanges}
                style={styles.saveButtonLarge}
              />
            </Box>
          </Animated.View>
        </ScrollView>

        {/* Add License Plate Modal */}
        <Modal
          visible={showAddLicensePlateModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddLicensePlateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBackground }]}>
              <Text variant="subtitle" fontWeight="bold" marginBottom="m">
                Kennzeichen hinzufügen
              </Text>

              <View style={[styles.inputContainer, { marginBottom: 12 }]}>
                <View style={styles.iconContainer}>
                  <Car size={20} color={theme.colors.secondaryText} />
                </View>
                <View style={styles.licenseContainer}>
                  <RNTextInput
                    style={[styles.licenseInput, { color: theme.colors.primaryText, width: 60 }]}
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
                    style={[styles.licenseInput, { color: theme.colors.primaryText, width: 40 }]}
                    placeholder="AB"
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
                    style={[styles.licenseInput, { color: theme.colors.primaryText, width: 70 }]}
                    placeholder="1234"
                    placeholderTextColor={theme.colors.secondaryText}
                    value={licensePart3}
                    onChangeText={handleLicensePart3Change}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              {licensePlateError ? (
                <Box
                  flexDirection="row"
                  alignItems="center"
                  marginBottom="m"
                  padding="xs"
                  borderRadius="s"
                  borderLeftWidth={3}
                  borderLeftColor="error"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(50,50,50,0.8)" : "rgba(245,245,245,0.9)",
                  }}
                >
                  <AlertCircle size={16} color={theme.colors.error} />
                  <Text variant="small" color="error" marginLeft="xs">
                    {licensePlateError}
                  </Text>
                </Box>
              ) : (
                <Box
                  flexDirection="row"
                  alignItems="center"
                  marginBottom="m"
                  padding="xs"
                  borderRadius="s"
                  borderLeftWidth={3}
                  borderLeftColor="primary"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(50,50,50,0.8)" : "rgba(245,245,245,0.9)",
                  }}
                >
                  <Info size={16} color={theme.colors.primary} />
                  <Text variant="small" marginLeft="xs">
                    Format: Stadt-Buchstaben-Zahlen (z.B. M-AB-123)
                  </Text>
                </Box>
              )}

              <Box flexDirection="row" justifyContent="flex-end">
                <Button
                  title="Abbrechen"
                  onPress={() => {
                    setShowAddLicensePlateModal(false)
                    setLicensePart1("")
                    setLicensePart2("")
                    setLicensePart3("")
                    setLicensePlateError("")
                  }}
                  variant="outline"
                  size="medium"
                  style={{ marginRight: 12 }}
                />
                <Button
                  title="Hinzufügen"
                  onPress={handleAddLicensePlate}
                  variant="primary"
                  size="medium"
                  loading={addingLicensePlate}
                  disabled={addingLicensePlate || !licensePart1 || !licensePart2 || !licensePart3}
                />
              </Box>
            </View>
          </View>
        </Modal>

        {/* Custom Success Modal */}
        <Modal visible={showSuccessModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.successModal,
                {
                  backgroundColor: theme.colors.cardBackground,
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Box
                width={60}
                height={60}
                borderRadius="full"
                backgroundColor="success"
                justifyContent="center"
                alignItems="center"
                marginBottom="m"
              >
                <CheckCircle size={30} color="white" />
              </Box>
              <Text variant="title" fontWeight="bold" marginBottom="s">
                Profil aktualisiert
              </Text>
              <Text variant="body" textAlign="center" color="secondaryText">
                Deine Änderungen wurden erfolgreich gespeichert.
              </Text>
            </Animated.View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topGradient: {
    height: 120,
    width: "100%",
    position: "absolute",
    top: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: 80, // Increased space from top
    marginBottom: 20,
    position: "relative",
  },
  avatarInner: {
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  editIconContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fieldContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
  },
  bioInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  saveButtonLarge: {
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successModal: {
    width: "80%",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeContainer: {
    marginLeft: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "primaryLight",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  licensePlateAction: {
    padding: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
    borderColor: "#ccc",
  },
  iconContainer: {
    marginRight: 12,
  },
  licenseContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  licenseInput: {
    height: 50,
    fontSize: 16,
    textAlign: "center",
  },
  licenseSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 8,
  },
})

export default EditProfileScreen
