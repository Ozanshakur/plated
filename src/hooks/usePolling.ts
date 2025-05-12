"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Hook für regelmäßiges Polling von Daten
 * @param callback Die Funktion, die bei jedem Polling-Intervall ausgeführt wird
 * @param interval Das Polling-Intervall in Millisekunden (Standard: 5000ms)
 * @param enabled Ob das Polling aktiviert ist (Standard: true)
 */
export function usePolling(callback: () => Promise<void> | void, interval = 5000, enabled = true) {
  const [isPolling, setIsPolling] = useState(enabled)
  const savedCallback = useRef<typeof callback>(callback) // Hier den initialValue hinzufügen

  // Speichere die aktuelle Callback-Funktion
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Starte/Stoppe das Polling
  useEffect(() => {
    if (!isPolling) return

    const tick = async () => {
      if (savedCallback.current) {
        try {
          await savedCallback.current()
        } catch (error) {
          console.error("Polling error:", error)
        }
      }
    }

    // Führe die Callback-Funktion sofort aus
    tick()

    // Starte das Intervall
    const id = setInterval(tick, interval)

    // Bereinige das Intervall beim Unmount
    return () => clearInterval(id)
  }, [isPolling, interval])

  // Funktion zum Starten/Stoppen des Pollings
  const togglePolling = (newState?: boolean) => {
    setIsPolling(newState !== undefined ? newState : !isPolling)
  }

  return { isPolling, togglePolling }
}
