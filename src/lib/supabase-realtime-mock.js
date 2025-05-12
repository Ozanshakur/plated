// Mock für Supabase Realtime Client
export class RealtimeClient {
    constructor() {
      console.warn("Realtime is disabled")
    }
  
    connect() {
      console.warn("Realtime is disabled")
      return this
    }
  
    disconnect() {
      console.warn("Realtime is disabled")
      return this
    }
  
    channel() {
      return {
        subscribe: () => ({ unsubscribe: () => {} }),
        on: () => this,
        send: () => {},
      }
    }
  }
  
  // Exportiere einen leeren Mock für das WebSocket-Paket
  export const WebSocket = null
  