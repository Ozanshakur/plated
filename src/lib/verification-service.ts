import { supabase } from "./supabase"
import { createNotification } from "./notification-service"
import type { VerificationStatus, VerificationImage, VerificationInfo } from "../types/verification"

export const verificationService = {
  // Verifizierungsinformationen abrufen
  async getVerificationInfo(userId: string): Promise<VerificationInfo | null> {
    try {
      console.log("Rufe Verifizierungsinformationen ab für Benutzer:", userId)

      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Fehler beim Abrufen des Profils:", error)
        throw error
      }

      if (!data) {
        console.error("Kein Profil gefunden für Benutzer:", userId)
        return null
      }

      // Berechne die verbleibenden Tage bis zum Ablauf
      let daysLeft: number | null = null
      if (data.verification_expires_at) {
        const expiryDate = new Date(data.verification_expires_at)
        const today = new Date()
        const diffTime = expiryDate.getTime() - today.getTime()
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      return {
        code: data.verification_code || "",
        status: data.verification_status || "not_verified",
        generatedAt: data.verification_code_generated_at,
        expiresAt: data.verification_expires_at,
        submittedAt: data.verification_submitted_at,
        reviewedAt: data.verification_reviewed_at,
        daysLeft,
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Verifizierungsinformationen:", error)
      return null
    }
  },

  // Verifizierungscode generieren
  async generateVerificationCode(userId: string): Promise<string | null> {
    try {
      console.log("Generiere Verifizierungscode für Benutzer:", userId)

      const { data, error } = await supabase.rpc("generate_verification_code", {
        user_id_param: userId,
      })

      if (error) {
        console.error("Fehler beim Generieren des Verifizierungscodes:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("Fehler beim Generieren des Verifizierungscodes:", error)
      return null
    }
  },

  // Verifizierungsbilder hochladen
  async uploadVerificationImage(
    userId: string,
    imageType: "license_plate" | "dashboard",
    imageBase64: string,
  ): Promise<boolean> {
    try {
      console.log(`Lade Verifizierungsbild vom Typ ${imageType} hoch für Benutzer:`, userId)

      // Prüfe, ob bereits ein Bild dieses Typs existiert
      const { data: existingImages, error: queryError } = await supabase
        .from("verification_images")
        .select("id")
        .eq("user_id", userId)
        .eq("image_type", imageType)

      if (queryError) {
        console.error("Fehler beim Abfragen vorhandener Bilder:", queryError)
        throw queryError
      }

      // Wenn ein Bild existiert, aktualisiere es
      if (existingImages && existingImages.length > 0) {
        const { error: updateError } = await supabase
          .from("verification_images")
          .update({
            image_base64: imageBase64,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingImages[0].id)

        if (updateError) {
          console.error("Fehler beim Aktualisieren des Bildes:", updateError)
          throw updateError
        }
      } else {
        // Sonst füge ein neues Bild hinzu
        const { error: insertError } = await supabase.from("verification_images").insert({
          user_id: userId,
          image_type: imageType,
          image_base64: imageBase64,
        })

        if (insertError) {
          console.error("Fehler beim Einfügen des Bildes:", insertError)
          throw insertError
        }
      }

      return true
    } catch (error) {
      console.error("Fehler beim Hochladen des Verifizierungsbildes:", error)
      return false
    }
  },

  // Verifizierungsbilder abrufen
  async getVerificationImages(userId: string): Promise<VerificationImage[]> {
    try {
      console.log("Rufe Verifizierungsbilder ab für Benutzer:", userId)

      const { data, error } = await supabase.from("verification_images").select("*").eq("user_id", userId)

      if (error) {
        console.error("Fehler beim Abrufen der Verifizierungsbilder:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Fehler beim Abrufen der Verifizierungsbilder:", error)
      return []
    }
  },

  // Verifizierung einreichen
  async submitVerification(userId: string): Promise<boolean> {
    try {
      console.log("Reiche Verifizierung ein für Benutzer:", userId)

      // Prüfe, ob beide Bilder vorhanden sind
      const images = await this.getVerificationImages(userId)
      const hasLicensePlateImage = images.some((img) => img.image_type === "license_plate")
      const hasDashboardImage = images.some((img) => img.image_type === "dashboard")

      if (!hasLicensePlateImage || !hasDashboardImage) {
        console.error("Es fehlen Bilder für die Verifizierung")
        return false
      }

      // Reiche die Verifizierung ein
      const { data, error } = await supabase.rpc("submit_verification", {
        user_id_param: userId,
      })

      if (error) {
        console.error("Fehler beim Einreichen der Verifizierung:", error)
        throw error
      }

      // Sende eine Benachrichtigung an den Benutzer
      await createNotification(
        userId,
        "verification_submitted",
        "Deine Verifizierung wurde eingereicht und wird überprüft.",
        userId,
        { status: "pending" },
      )

      return true
    } catch (error) {
      console.error("Fehler beim Einreichen der Verifizierung:", error)
      return false
    }
  },

  // Verifizierungsstatus aktualisieren (für Admin-Zwecke)
  async updateVerificationStatus(userId: string, status: VerificationStatus, adminId?: string): Promise<boolean> {
    try {
      console.log(`Aktualisiere Verifizierungsstatus auf ${status} für Benutzer:`, userId)

      const { data, error } = await supabase.rpc("update_verification_status", {
        user_id_param: userId,
        status_param: status,
        admin_id_param: adminId || null,
      })

      if (error) {
        console.error("Fehler beim Aktualisieren des Verifizierungsstatus:", error)
        throw error
      }

      // Sende eine Benachrichtigung an den Benutzer
      let notificationType: string
      let notificationContent: string

      if (status === "verified") {
        notificationType = "verification_approved"
        notificationContent = "Deine Verifizierung wurde genehmigt! Dein Konto ist jetzt vollständig verifiziert."
      } else if (status === "rejected") {
        notificationType = "verification_rejected"
        notificationContent =
          "Deine Verifizierung wurde abgelehnt. Bitte überprüfe die Anforderungen und versuche es erneut."
      } else {
        notificationType = "verification_status_update"
        notificationContent = `Dein Verifizierungsstatus wurde auf "${status}" aktualisiert.`
      }

      await createNotification(userId, notificationType, notificationContent, userId, { status })

      return true
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Verifizierungsstatus:", error)
      return false
    }
  },

  // Verifizierungsstatus zurücksetzen
  async resetVerification(userId: string): Promise<boolean> {
    try {
      console.log("Setze Verifizierung zurück für Benutzer:", userId)

      const { data, error } = await supabase.rpc("reset_verification", {
        user_id_param: userId,
      })

      if (error) {
        console.error("Fehler beim Zurücksetzen der Verifizierung:", error)
        throw error
      }

      // Lösche alle vorhandenen Bilder
      const { error: deleteError } = await supabase.from("verification_images").delete().eq("user_id", userId)

      if (deleteError) {
        console.error("Fehler beim Löschen der Verifizierungsbilder:", deleteError)
      }

      return true
    } catch (error) {
      console.error("Fehler beim Zurücksetzen der Verifizierung:", error)
      return false
    }
  },
}
