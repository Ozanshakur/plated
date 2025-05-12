// Ein leerer Mock für das ws-Paket
class WebSocketMock {
    constructor() {
      this.readyState = 3 // CLOSED
      this.onopen = null
      this.onclose = null
      this.onerror = null
      this.onmessage = null
    }
  
    send() {
      console.warn("WebSocket is mocked and does not actually send data")
    }
  
    close() {
      console.warn("WebSocket is mocked and does not actually close")
    }
  }
  
  // Exportiere einen leeren Mock für das ws-Paket
  module.exports = {
    WebSocket: WebSocketMock,
    createWebSocketStream: () => null,
    Server: class Server {},
    // Weitere Exports, die möglicherweise benötigt werden
  }
  