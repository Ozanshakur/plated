"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Session, User, AuthError } from "@supabase/supabase-js"
import { authService } from "../lib/auth-client"
import { profileService } from "../lib/profile-service"
import { authClient } from "../lib/auth-client"
import { supabase } from "../lib/supabase"
// Füge den Import für den Notification-Service hinzu
import { registerForPushNotificationsAsync } from "../lib/notification-service"
import AsyncStorage from "@react-native-async-storage/async-storage"

// AuthContextType-Schnittstelle
interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isEmailVerified: boolean
  loading: boolean
  signUp: (
    email: string,
    password: string,
    username: string,
    licensePlate: string,
  ) => Promise<{ error: AuthError | Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>
  signOut: () => Promise<void>
  refreshAuthStatus: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  // Aktualisiere den Auth-Status
  const refreshAuthStatus = async () => {
    try {
      // Hole die aktuelle Sitzung
      const { session: currentSession } = await authService.getSession()
      setSession(currentSession)

      if (currentSession?.user) {
        setUser(currentSession.user)

        // Hole den Verifizierungsstatus AUSSCHLIESSLICH aus der profiles-Tabelle
        const { data, error } = await supabase
          .from("profiles")
          .select("is_verified")
          .eq("id", currentSession.user.id)
          .single()

        if (error) {
          console.error("Fehler beim Abrufen des Verifizierungsstatus:", error)
          setIsEmailVerified(false)
        } else {
          console.log("Verifizierungsstatus aus DB:", data.is_verified)
          setIsEmailVerified(!!data.is_verified) // Stelle sicher, dass es ein Boolean ist
        }

        // Überprüfe, ob ein Profil existiert
        const { exists } = await profileService.profileExists(currentSession.user.id)
        console.log("Profil existiert:", exists)

        // Wenn kein Profil existiert, erstelle eines
        if (!exists && currentSession.user.email) {
          const username =
            currentSession.user.user_metadata?.username || `user_${currentSession.user.id.substring(0, 8)}`
          const licensePlate = currentSession.user.user_metadata?.license_plate || "XX-XX-000"

          await profileService.createProfile(currentSession.user.id, username, licensePlate, currentSession.user.email)
        }
      } else {
        setUser(null)
        setIsEmailVerified(false)
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Auth-Status:", error)
    }
  }

  // Initialisiere den Auth-Status
  useEffect(() => {
    // Initialer Abruf der Session
    const initAuth = async () => {
      setLoading(true)
      await refreshAuthStatus()
      setLoading(false)
    }

    initAuth()

    // Abonniere Änderungen an der Auth-Session
    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth-Event:", event)

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Hole den Verifizierungsstatus AUSSCHLIESSLICH aus der profiles-Tabelle
        const { data, error } = await supabase.from("profiles").select("is_verified").eq("id", session.user.id).single()

        if (error) {
          console.error("Fehler beim Abrufen des Verifizierungsstatus:", error)
          setIsEmailVerified(false)
        } else {
          console.log("Verifizierungsstatus aus DB:", data.is_verified)
          setIsEmailVerified(!!data.is_verified) // Stelle sicher, dass es ein Boolean ist
        }
      } else {
        setIsEmailVerified(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Registrierung ohne E-Mail-Bestätigung
  const signUp = async (
    email: string,
    password: string,
    username: string,
    licensePlate: string,
  ): Promise<{ error: AuthError | Error | null }> => {
    try {
      console.log("Registrierung gestartet mit:", { email, username, licensePlate })

      // 1. Überprüfe, ob der Benutzername verfügbar ist
      const { available: usernameAvailable, error: usernameError } = await profileService.isUsernameAvailable(username)

      if (usernameError) {
        console.error("Fehler bei der Überprüfung des Benutzernamens:", usernameError)
        return { error: new Error("Fehler bei der Datenbankabfrage") }
      }

      if (!usernameAvailable) {
        console.error("Benutzername existiert bereits:", username)
        return { error: new Error("Dieser Benutzername ist bereits vergeben") }
      }

      // 2. Überprüfe, ob das Kennzeichen verfügbar ist
      const { available: licensePlateAvailable, error: licensePlateError } =
        await profileService.isLicensePlateAvailable(licensePlate)

      if (licensePlateError) {
        console.error("Fehler bei der Überprüfung des Kennzeichens:", licensePlateError)
        return { error: new Error("Fehler bei der Datenbankabfrage") }
      }

      if (!licensePlateAvailable) {
        console.error("Kennzeichen existiert bereits:", licensePlate)
        return { error: new Error("Dieses Kennzeichen ist bereits registriert") }
      }

      // 3. Überprüfe, ob die E-Mail verfügbar ist
      const { available: emailAvailable, error: emailError } = await profileService.isEmailAvailable(email)

      if (emailError) {
        console.error("Fehler bei der Überprüfung der E-Mail:", emailError)
        return { error: new Error("Fehler bei der Datenbankabfrage") }
      }

      if (!emailAvailable) {
        console.error("E-Mail existiert bereits:", email)
        return { error: new Error("Diese E-Mail-Adresse ist bereits registriert") }
      }

      // 4. Registriere den Benutzer mit minimalen Optionen
      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            license_plate: licensePlate,
          },
        },
      })

      if (error) {
        console.error("Fehler bei der Benutzerregistrierung:", error)
        return { error }
      }

      if (!data.user) {
        console.error("Benutzer wurde nicht erstellt")
        return { error: new Error("Benutzer konnte nicht erstellt werden") }
      }

      console.log("Benutzer erfolgreich erstellt:", data.user.id)

      // 5. Erstelle das Profil mit der Benutzer-ID aus der Antwort
      const { error: profileError } = await profileService.createProfile(data.user.id, username, licensePlate, email)

      if (profileError) {
        console.warn("Fehler beim Erstellen des Profils:", profileError)
        // Wir brechen hier nicht ab, da der Benutzer bereits erstellt wurde
      }

      // 6. Registriere für Push-Benachrichtigungen
      try {
        await registerForPushNotificationsAsync()
      } catch (pushError) {
        console.warn("Fehler bei der Push-Registrierung:", pushError)
        // Nicht kritisch, daher kein Abbruch
      }

      console.log("Registrierung erfolgreich")
      return { error: null }
    } catch (error) {
      console.error("Unerwarteter Fehler bei der Registrierung:", error)
      return { error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  // Anmeldung ohne E-Mail-Bestätigungsprüfung
  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null }> => {
    try {
      const { data, error } = await authService.signIn(email, password)

      if (error) {
        return { error }
      }

      // Nach erfolgreichem Login für Push-Benachrichtigungen registrieren
      await registerForPushNotificationsAsync()

      // Hole den Verifizierungsstatus AUSSCHLIESSLICH aus der profiles-Tabelle
      if (data?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("is_verified")
          .eq("id", data.user.id)
          .single()

        if (profileError) {
          console.error("Fehler beim Abrufen des Verifizierungsstatus:", profileError)
          setIsEmailVerified(false)
        } else {
          console.log("Verifizierungsstatus aus DB:", profileData.is_verified)
          setIsEmailVerified(!!profileData.is_verified) // Stelle sicher, dass es ein Boolean ist
        }

        // Überprüfe, ob ein Profil existiert
        const { exists } = await profileService.profileExists(data.user.id)

        // Wenn kein Profil existiert, erstelle eines
        if (!exists && data.user.email) {
          const username = data.user.user_metadata?.username || `user_${data.user.id.substring(0, 8)}`
          const licensePlate = data.user.user_metadata?.license_plate || "XX-XX-000"

          await profileService.createProfile(data.user.id, username, licensePlate, data.user.email)
        }
      }

      return { error: null }
    } catch (error) {
      console.error("Fehler beim Anmelden:", error)
      return { error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      // Manuelles Abmelden ohne Realtime-Funktionalität
      try {
        // Versuche zuerst die normale Abmeldung
        await authClient.auth.signOut()
      } catch (signOutError) {
        console.log("Normaler Abmeldeversuch fehlgeschlagen, verwende Fallback-Methode")
        // Fallback: Lösche die Session manuell
        await AsyncStorage.removeItem("supabase.auth.token")
        // Setze den lokalen Zustand zurück
        setUser(null)
        setSession(null)
        setIsEmailVerified(false)
      }

      // Wir geben keinen Fehler zurück, da der Benutzer aus Sicht der App erfolgreich abgemeldet wurde
      console.log("Benutzer erfolgreich abgemeldet")
    } catch (error) {
      // Logge den Fehler, aber zeige keine Fehlermeldung an
      console.error("Fehler beim Abmelden (wird ignoriert):", error)
      // Setze trotzdem den lokalen Zustand zurück
      setUser(null)
      setSession(null)
      setIsEmailVerified(false)
    }
  }

  const refreshUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)

        // Fetch the latest profile data
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileData) {
          setProfile(profileData)
        }
      }
    } catch (error) {
      console.error("Error refreshing user:", error)
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    isEmailVerified,
    signIn,
    signUp,
    signOut,
    refreshUser,
    refreshAuthStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
