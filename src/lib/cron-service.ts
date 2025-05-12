import { supabase } from "./supabase"

// Service für Cron-Jobs und regelmäßige Aufgaben
export const cronService = {
  // Prüfe abgelaufene Verifizierungen und lösche betroffene Konten
  async checkExpiredVerifications(): Promise<{ success: boolean; deletedAccounts: number }> {
    try {
      const { data, error } = await supabase.rpc("api_check_expired_verifications")

      if (error) throw error

      return {
        success: data.success,
        deletedAccounts: data.deleted_accounts,
      }
    } catch (error) {
      console.error("Fehler beim Prüfen abgelaufener Verifizierungen:", error)
      return {
        success: false,
        deletedAccounts: 0,
      }
    }
  },
}
