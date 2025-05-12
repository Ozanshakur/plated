"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Keyboard,
  Platform,
  StatusBar as RNStatusBar,
  View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import Box from "../../components/ui/Box"
import Text from "../../components/ui/Text"
import { Camera, X, Image as ImageIcon, ArrowLeft } from "lucide-react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { StatusBar } from "expo-status-bar"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { compressAndConvertToBase64, isBase64TooLarge } from "../../lib/image-utils"
import * as FileSystem from "expo-file-system"
import { decode } from "base64-arraybuffer"

const { width } = Dimensions.get("window")
const isTablet = width >= 768

const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation()
  const { user, isAuthenticated, isEmailVerified } = useAuth()
  const { theme, isDarkMode } = useTheme()
  const insets = useSafeAreaInsets()

  const [content, setContent] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const [textInputHeight, setTextInputHeight] = useState(120)

  // Animationen
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const imageScale = useRef(new Animated.Value(1)).current
  const imageOpacity = useRef(new Animated.Value(1)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Animiere den Button beim Drücken
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    // Animiere das Einblenden des Screens
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
    })

    // Setze die Statusleiste auf transparent
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(true)
      RNStatusBar.setBackgroundColor("transparent")
    }

    return () => {
      keyboardDidHideListener.remove()
      keyboardDidShowListener.remove()

      // Setze die Statusleiste zurück
      if (Platform.OS === "android") {
        RNStatusBar.setTranslucent(false)
        RNStatusBar.setBackgroundColor(isDarkMode ? "#121212" : "#FFFFFF")
      }
    }
  }, [fadeAnim, slideAnim, isDarkMode])

  const getImageInfo = async (uri: string) => {
    try {
      // Versuche, den MIME-Typ aus dem URI zu extrahieren
      const fileInfo = await FileSystem.getInfoAsync(uri)
      console.log("Dateiinfo:", fileInfo)

      // Bestimme den MIME-Typ basierend auf der Dateiendung
      const extension = uri.split(".").pop()?.toLowerCase() || ""
      let mimeType = "image/jpeg" // Standard

      if (extension === "png") {
        mimeType = "image/png"
      } else if (extension === "gif") {
        mimeType = "image/gif"
      } else if (extension === "webp") {
        mimeType = "image/webp"
      }

      return {
        mimeType,
        extension,
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Bildinformationen:", error)
      return {
        mimeType: "image/jpeg",
        extension: "jpg",
      }
    }
  }

  const processImage = async (uri: string) => {
    try {
      // Konvertiere das Bild zu Base64
      const base64 = await compressAndConvertToBase64(uri, 0.7)

      if (!base64) {
        Alert.alert("Fehler", "Das Bild konnte nicht verarbeitet werden.")
        return null
      }

      // Prüfe, ob das Bild zu groß ist (max. 1 MB)
      if (isBase64TooLarge(base64, 1)) {
        Alert.alert("Fehler", "Das Bild ist zu groß. Bitte wähle ein kleineres Bild oder reduziere die Qualität.")
        return null
      }

      console.log(`Base64-Bild erstellt (gekürzt): ${base64.substring(0, 50)}...`)
      return base64
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Bildes:", error)
      Alert.alert("Fehler", "Das Bild konnte nicht verarbeitet werden.")
      return null
    }
  }

  const pickImage = async () => {
    if (!isAuthenticated) {
      Alert.alert("Anmeldung erforderlich", "Du musst angemeldet sein, um Fotos hochzuladen.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Anmelden", onPress: () => navigation.navigate("SignIn" as never) },
      ])
      return
    }

    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail" as never)
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Berechtigung erforderlich", "Wir benötigen die Berechtigung, auf deine Fotos zuzugreifen.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Reduzierte Qualität für kleinere Dateien
      })

      if (!result.canceled) {
        const uri = result.assets[0].uri

        // Hole Bildinformationen
        const { mimeType, extension } = await getImageInfo(uri)
        setImageType(mimeType)
        console.log(`Bildtyp: ${mimeType}, Erweiterung: ${extension}`)

        // Verarbeite das Bild
        const base64 = await processImage(uri)

        if (base64) {
          // Animation beim Hinzufügen eines Bildes
          Animated.sequence([
            Animated.timing(imageScale, {
              toValue: 1.05,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(imageScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start()

          setImage(uri)
          setImageBase64(base64)
        }
      }
    } catch (error) {
      console.error("Fehler beim Auswählen des Bildes:", error)
      Alert.alert("Fehler", "Das Bild konnte nicht ausgewählt werden.")
    }
  }

  const takePhoto = async () => {
    if (!isAuthenticated) {
      Alert.alert("Anmeldung erforderlich", "Du musst angemeldet sein, um Fotos aufzunehmen.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Anmelden", onPress: () => navigation.navigate("SignIn" as never) },
      ])
      return
    }

    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail" as never)
      return
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Berechtigung erforderlich", "Wir benötigen die Berechtigung, auf deine Kamera zuzugreifen.")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Reduzierte Qualität für kleinere Dateien
      })

      if (!result.canceled) {
        const uri = result.assets[0].uri

        // Hole Bildinformationen
        const { mimeType, extension } = await getImageInfo(uri)
        setImageType(mimeType)
        console.log(`Bildtyp: ${mimeType}, Erweiterung: ${extension}`)

        // Verarbeite das Bild
        const base64 = await processImage(uri)

        if (base64) {
          // Animation beim Hinzufügen eines Bildes
          Animated.sequence([
            Animated.timing(imageScale, {
              toValue: 1.05,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(imageScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start()

          setImage(uri)
          setImageBase64(base64)
        }
      }
    } catch (error) {
      console.error("Fehler beim Aufnehmen des Fotos:", error)
      Alert.alert("Fehler", "Das Foto konnte nicht aufgenommen werden.")
    }
  }

  const removeImage = () => {
    // Animation beim Entfernen eines Bildes
    Animated.timing(imageOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setImage(null)
      setImageBase64(null)
      setImageType(null)
      imageOpacity.setValue(1)
    })
  }

  // Funktion zum Hochladen des Bildes in den Supabase-Speicher
  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true)
      console.log("Starte Bildupload...")

      // Hole Bildinformationen
      const { mimeType, extension } = await getImageInfo(uri)
      console.log(`Bildtyp für Upload: ${mimeType}, Erweiterung: ${extension}`)

      // Lese die Datei als Binärdaten
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (!fileContent) {
        throw new Error("Konnte Bilddaten nicht lesen")
      }

      console.log(`Base64-String gelesen, Länge: ${fileContent.length} Zeichen`)

      // Generiere einen eindeutigen Dateinamen
      const fileName = `${Date.now()}.${extension}`
      const filePath = `${user?.id}/${fileName}`

      console.log(`Lade Bild hoch: ${filePath}`)

      // Konvertiere Base64 zu ArrayBuffer für den Upload
      const arrayBuffer = decode(fileContent)

      console.log(`ArrayBuffer erstellt, Länge: ${arrayBuffer.byteLength} Bytes`)

      // Lade das Bild hoch
      const { data, error } = await supabase.storage.from("post-images").upload(filePath, arrayBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
      })

      if (error) {
        console.error("Fehler beim Hochladen des Bildes:", error)
        throw error
      }

      console.log("Bild erfolgreich hochgeladen:", data)

      // Generiere die öffentliche URL
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl
      console.log("Generierte Bild-URL:", imageUrl)

      // Teste, ob das Bild zugänglich ist
      try {
        const testResponse = await fetch(imageUrl, { method: "HEAD" })
        console.log(
          "Bildtest-Antwort:",
          testResponse.status,
          testResponse.ok,
          "Content-Length:",
          testResponse.headers.get("Content-Length"),
        )

        if (!testResponse.ok || testResponse.headers.get("Content-Length") === "0") {
          console.warn("Bild ist möglicherweise nicht zugänglich oder leer!")
        }
      } catch (testError) {
        console.warn("Fehler beim Testen des Bildzugriffs:", testError)
      }

      return imageUrl
    } catch (error) {
      console.error("Fehler beim Hochladen des Bildes:", error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const createPost = async () => {
    animateButtonPress()

    if (!isAuthenticated) {
      Alert.alert("Anmeldung erforderlich", "Du musst angemeldet sein, um einen Beitrag zu erstellen.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Anmelden", onPress: () => navigation.navigate("SignIn" as never) },
      ])
      return
    }

    if (!isEmailVerified) {
      navigation.navigate("VerifyEmail" as never)
      return
    }

    if (!content.trim() && !image) {
      Alert.alert("Fehler", "Bitte gib einen Text ein oder füge ein Bild hinzu.")
      return
    }

    setPosting(true)

    try {
      let imageUrl: string | null = null

      // Lade das Bild hoch, wenn eines ausgewählt wurde
      if (image) {
        imageUrl = await uploadImageToStorage(image)

        if (!imageUrl) {
          console.warn("Bildupload fehlgeschlagen, verwende Base64 als Fallback")
        }
      }

      // Erstelle den Post-Objekt
      const postData: any = {
        user_id: user?.id,
        content: content.trim(),
      }

      // Füge die Bild-URL oder Base64 hinzu, je nachdem was verfügbar ist
      if (imageUrl) {
        postData.image_url = imageUrl
        console.log("Verwende Bild-URL:", imageUrl)
      } else if (imageBase64) {
        postData.image_base64 = imageBase64
        console.log("Verwende Base64-Bild als Fallback")
      }

      console.log("Erstelle Post mit folgenden Daten:", {
        ...postData,
        image_url: postData.image_url,
        image_base64: postData.image_base64 ? "[Base64-Daten gekürzt]" : null,
      })

      // Sende die Daten an Supabase
      const { data, error } = await supabase.from("posts").insert([postData]).select()

      if (error) {
        console.error("Fehler beim Erstellen des Posts:", error)
        throw error
      }

      console.log("Post erfolgreich erstellt:", data)

      // Erfolgsanimation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setContent("")
        setImage(null)
        setImageBase64(null)
        setImageType(null)
        // Navigiere zurück zur Home-Seite
        navigation.navigate("Home" as never)

        // Zeige Erfolgsmeldung nach der Navigation
        setTimeout(() => {
          Alert.alert("Erfolg", "Dein Beitrag wurde erfolgreich erstellt.")
        }, 300)
      })
    } catch (error) {
      console.error("Fehler beim Erstellen des Beitrags:", error)
      Alert.alert("Fehler", "Der Beitrag konnte nicht erstellt werden.")
    } finally {
      setPosting(false)
    }
  }

  const handleGoBack = () => {
    // Animiere das Ausblenden des Screens
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack()
    })
  }

  if (!isAuthenticated) {
    return (
      <Box flex={1} backgroundColor="mainBackground">
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <Box flex={1} justifyContent="center" alignItems="center" padding="l">
          <Box
            width={80}
            height={80}
            borderRadius="full"
            backgroundColor="primaryLight"
            justifyContent="center"
            alignItems="center"
            marginBottom="l"
          >
            <ImageIcon size={40} color={theme.colors.primary} />
          </Box>
          <Text variant="title" marginBottom="m" textAlign="center">
            Anmeldung erforderlich
          </Text>
          <Text variant="body" textAlign="center" marginBottom="l" color="secondaryText">
            Du musst angemeldet sein, um Beiträge zu erstellen.
          </Text>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate("SignIn" as never)}
          >
            <Text variant="button" color="buttonText">
              Anmelden
            </Text>
          </TouchableOpacity>
        </Box>
      </Box>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "rgba(18, 18, 18, 0.98)" : "rgba(255, 255, 255, 0.98)" },
      ]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 20,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          },
        ]}
      >
        {/* Header */}
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="m">
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
            <ArrowLeft size={24} color={theme.colors.primaryText} />
          </TouchableOpacity>

          <Text variant="title" textAlign="center">
            Neuer Beitrag
          </Text>

          <View style={{ width: 24 }} />
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletScrollContent]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Text Input */}
          <Box
            marginBottom="m"
            style={[
              styles.textInputWrapper,
              {
                backgroundColor: isDarkMode ? "rgba(30, 30, 30, 0.8)" : "rgba(250, 250, 250, 0.8)",
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              placeholder="Was möchtest du teilen?"
              value={content}
              onChangeText={setContent}
              multiline
              onContentSizeChange={(event) => {
                const height = event.nativeEvent.contentSize.height
                setTextInputHeight(Math.max(120, Math.min(300, height)))
              }}
              style={[
                styles.textInput,
                {
                  color: theme.colors.primaryText,
                  height: textInputHeight,
                },
              ]}
              placeholderTextColor={theme.colors.secondaryText}
            />
          </Box>

          {/* Image Preview */}
          {image && (
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  transform: [{ scale: imageScale }],
                  opacity: imageOpacity,
                  backgroundColor: isDarkMode ? "rgba(30, 30, 30, 0.5)" : "rgba(250, 250, 250, 0.5)",
                },
              ]}
            >
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage} activeOpacity={0.8}>
                <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={styles.blurView}>
                  <X size={18} color={theme.colors.primaryText} />
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Box flexDirection="row" marginTop="m" marginBottom="l">
            <TouchableOpacity
              style={[
                styles.mediaButton,
                {
                  backgroundColor: isDarkMode ? "rgba(30, 30, 30, 0.8)" : "rgba(250, 250, 250, 0.8)",
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <ImageIcon size={22} color={theme.colors.primary} />
              <Text variant="body" marginLeft="s" color="primaryText">
                Galerie
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mediaButton,
                {
                  backgroundColor: isDarkMode ? "rgba(30, 30, 30, 0.8)" : "rgba(250, 250, 250, 0.8)",
                  borderColor: theme.colors.border,
                  marginLeft: 12,
                },
              ]}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Camera size={22} color={theme.colors.primary} />
              <Text variant="body" marginLeft="s" color="primaryText">
                Kamera
              </Text>
            </TouchableOpacity>
          </Box>
        </ScrollView>

        {/* Post Button */}
        <Animated.View style={[styles.postButtonContainer, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity
            style={[
              styles.postButton,
              !content.trim() && !image && styles.disabledButton,
              posting && styles.loadingButton,
            ]}
            onPress={createPost}
            disabled={posting || (!content.trim() && !image)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text variant="button" color="buttonText">
                {posting ? "Wird gepostet..." : "Beitrag erstellen"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabletScrollContent: {
    alignItems: "center",
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textInputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  textInput: {
    fontSize: 16,
    textAlignVertical: "top",
    paddingTop: 0,
    paddingBottom: 0,
  },
  imageContainer: {
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  blurView: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  postButtonContainer: {
    marginTop: 16,
    width: "100%",
  },
  postButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingButton: {
    opacity: 0.8,
  },
  authButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
})

export default CreatePostScreen
