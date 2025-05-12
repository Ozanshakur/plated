import { supabase } from "./supabase"

// Service für Profiloperationen
export const profileService = {
  // Profil erstellen
  async createProfile(userId: string, username: string, licensePlate: string, email: string) {
    console.log("Erstelle Profil für Benutzer:", userId)

    try {
      // Prüfe, ob der Benutzername bereits existiert
      const { data: existingUsername, error: usernameError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle()

      if (usernameError) {
        console.error("Fehler bei der Überprüfung des Benutzernamens:", usernameError)
        throw new Error("Fehler bei der Datenbankabfrage")
      }

      if (existingUsername) {
        throw new Error("Dieser Benutzername ist bereits vergeben")
      }

      // Prüfe, ob das Kennzeichen bereits existiert
      const { data: existingLicense, error: licenseError } = await supabase
        .from("profiles")
        .select("id")
        .eq("license_plate", licensePlate)
        .maybeSingle()

      if (licenseError) {
        console.error("Fehler bei der Überprüfung des Kennzeichens:", licenseError)
        throw new Error("Fehler bei der Datenbankabfrage")
      }

      if (existingLicense) {
        throw new Error("Dieses Kennzeichen ist bereits registriert")
      }

      // Prüfe, ob die E-Mail bereits existiert
      const { data: existingEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      if (emailError) {
        console.error("Fehler bei der Überprüfung der E-Mail:", emailError)
        throw new Error("Fehler bei der Datenbankabfrage")
      }

      if (existingEmail) {
        throw new Error("Diese E-Mail-Adresse ist bereits registriert")
      }

      // Verwende die spezielle Funktion zum Erstellen des Profils
      // Diese Funktion umgeht die RLS-Richtlinien
      const { data, error } = await supabase.rpc("create_profile", {
        user_id: userId,
        username: username,
        license_plate: licensePlate,
        email: email,
        is_verified: false,
      })

      if (error) {
        console.error("Fehler beim Erstellen des Profils mit RPC:", error)

        // Fallback: Versuche direkt in die Tabelle einzufügen
        const { data: insertData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            username,
            license_plate: licensePlate,
            email,
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertError) {
          console.error("Fehler beim direkten Einfügen des Profils:", insertError)
          throw insertError
        }

        console.log("Profil erfolgreich mit direktem Einfügen erstellt:", insertData)
        return { profile: insertData, error: null }
      }

      console.log("Profil erfolgreich mit RPC erstellt:", data)
      return { profile: data, error: null }
    } catch (error) {
      console.error("Fehler beim Erstellen des Profils:", error)
      return { profile: null, error }
    }
  },

  // Profil abrufen
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen des Profils:", error)
      return { profile: null, error }
    }
  },

  // Profil nach E-Mail abrufen
  async getProfileByEmail(email: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("email", email).single()

      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen des Profils:", error)
      return { profile: null, error }
    }
  },

  // Profil nach Benutzernamen abrufen
  async getProfileByUsername(username: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).single()

      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error("Fehler beim Abrufen des Profils:", error)
      return { profile: null, error }
    }
  },

  // Prüfen, ob ein Profil existiert
  async profileExists(userId: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()

      if (error) throw error
      return { exists: data !== null, error: null }
    } catch (error) {
      console.error("Fehler beim Überprüfen des Profils:", error)
      return { exists: false, error }
    }
  },

  // Benutzernamen auf Verfügbarkeit prüfen
  async isUsernameAvailable(username: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle()

      if (error) throw error
      return { available: data === null, error: null }
    } catch (error) {
      console.error("Fehler bei der Überprüfung des Benutzernamens:", error)
      return { available: false, error }
    }
  },

  // Kennzeichen auf Verfügbarkeit prüfen
  async isLicensePlateAvailable(licensePlate: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("license_plate", licensePlate)
        .maybeSingle()

      if (error) throw error
      return { available: data === null, error: null }
    } catch (error) {
      console.error("Fehler bei der Überprüfung des Kennzeichens:", error)
      return { available: false, error }
    }
  },

  // E-Mail auf Verfügbarkeit prüfen
  async isEmailAvailable(email: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle()

      if (error) throw error
      return { available: data === null, error: null }
    } catch (error) {
      console.error("Fehler bei der Überprüfung der E-Mail:", error)
      return { available: false, error }
    }
  },

  // Verifizierungsstatus aktualisieren
  async updateVerificationStatus(userId: string, isVerified: boolean) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single()

      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Verifizierungsstatus:", error)
      return { profile: null, error }
    }
  },

  // Verifizierungsstatus manuell setzen (für Testzwecke)
  async setVerificationStatus(userId: string, isVerified: boolean) {
    try {
      // Verwende die RPC-Funktion zum Setzen des Verifizierungsstatus
      const { data, error } = await supabase.rpc("set_profile_verification", {
        user_id: userId,
        is_verified: isVerified,
      })

      if (error) {
        console.error("Fehler bei RPC set_profile_verification:", error)

        // Fallback: Direktes Update
        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({
            is_verified: isVerified,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
          .select()
          .single()

        if (updateError) throw updateError
        return { profile: updateData, error: null }
      }

      // Hole das aktualisierte Profil
      const { profile } = await this.getProfile(userId)
      return { profile, error: null }
    } catch (error) {
      console.error("Fehler beim Setzen des Verifizierungsstatus:", error)
      return { profile: null, error }
    }
  },

  // Alle Profile verifizieren (nur für Testzwecke)
  async verifyAllProfiles() {
    try {
      const { error } = await supabase.rpc("verify_all_profiles")

      if (error) {
        console.error("Fehler bei RPC verify_all_profiles:", error)

        // Fallback: Direktes Update
        const { error: updateError } = await supabase.from("profiles").update({
          is_verified: true,
          updated_at: new Date().toISOString(),
        })

        if (updateError) throw updateError
      }

      return { success: true, error: null }
    } catch (error) {
      console.error("Fehler beim Verifizieren aller Profile:", error)
      return { success: false, error }
    }
  },
}
