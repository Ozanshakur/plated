// Ein einfacher WebSocket-Polyfill, der die native WebSocket-API verwendet
class WebSocketPolyfill {
    constructor(url, protocols) {
      // Verwende die native WebSocket-Implementierung
      this._ws = new WebSocket(url, protocols)
  
      // Leite Ereignisse weiter
      this._ws.onopen = (event) => {
        if (this.onopen) this.onopen(event)
      }
  
      this._ws.onclose = (event) => {
        if (this.onclose) this.onclose(event)
      }
  
      this._ws.onerror = (event) => {
        if (this.onerror) this.onerror(event)
      }
  
      this._ws.onmessage = (event) => {
        if (this.onmessage) this.onmessage(event)
      }
    }
  
    // Implementiere die WebSocket-API
    send(data) {
      this._ws.send(data)
    }
  
    close(code, reason) {
      this._ws.close(code, reason)
    }
  
    // Getter für Eigenschaften
    get readyState() {
      return this._ws.readyState
    }
  
    get bufferedAmount() {
      return this._ws.bufferedAmount
    }
  
    get extensions() {
      return this._ws.extensions
    }
  
    get protocol() {
      return this._ws.protocol
    }
  
    get url() {
      return this._ws.url
    }
  
    // Statische Eigenschaften
    static get CONNECTING() {
      return 0
    }
    static get OPEN() {
      return 1
    }
    static get CLOSING() {
      return 2
    }
    static get CLOSED() {
      return 3
    }
  }
  
  // Exportiere den Polyfill
  module.exports = {
    WebSocket: WebSocketPolyfill,
    // Füge leere Implementierungen für andere ws-Funktionen hinzu
    createWebSocketStream: () => null,
    Server: class Server {},
  }
  