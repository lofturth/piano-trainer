import { WebSocket, WebSocketServer } from 'ws'
import { pathToFileURL } from 'node:url'
import { validScreen } from '../src/touchscreen.js'

export function startRelay(port = 8765, host = '0.0.0.0') {
  const server = new WebSocketServer({ port, host, maxPayload: 4096 })
  let controller = null
  let latest = null
  let latestScreen = null
  let lastSeen = 0
  const send = (socket, message) => {
    if (socket.readyState !== WebSocket.OPEN) return
    if (socket.bufferedAmount > 65536) return socket.terminate()
    socket.send(JSON.stringify(message))
  }
  const status = () => {
    for (const socket of server.clients) {
      send(socket, { type: 'status', controllerConnected: controller !== null })
    }
  }
  const release = socket => {
    if (controller !== socket) return
    controller = null
    latest = null
    latestScreen = null
    status()
  }
  server.on('connection', socket => {
    let role = null
    socket.on('error', () => socket.terminate())
    socket.on('close', () => release(socket))
    socket.on('message', (data, binary) => {
      let message
      try { message = JSON.parse(data.toString()) } catch { return socket.close(1008, 'Invalid JSON') }
      if (binary || !message || typeof message !== 'object') return socket.close(1008, 'Invalid message')
      if (!role) {
        if (!['controller', 'trainer'].includes(message.role)) return socket.close(1008, 'Register role first')
        if (message.role === 'controller' && controller) return socket.close(1008, 'Controller already connected')
        role = message.role
        socket.role = role
        if (role === 'controller') {
          controller = socket
          lastSeen = performance.now()
        }
        status()
        if (role === 'trainer' && latest) send(socket, latest)
        if (role === 'trainer' && latestScreen) send(socket, { type: 'touches', screen: latestScreen })
        return
      }
      if (socket !== controller) return
      if (message.type === 'touches') {
        if (validScreen(message.screen)) {
          lastSeen = performance.now()
          latestScreen = message.screen
          for (const peer of server.clients) {
            if (peer.role === 'trainer') send(peer, { type: 'touches', screen: latestScreen })
          }
        }
        return
      }
      if (message.type === 'heartbeat') {
        lastSeen = performance.now()
        return
      }
      const { type, state, thumb = false, seq, t } = message
      if (type !== 'fingers' || !Number.isInteger(state) || state < 0 || state > 15
        || typeof thumb !== 'boolean'
        || !Number.isSafeInteger(seq) || seq < 0 || !Number.isFinite(t) || t < 0
        || (latest ? seq !== latest.seq + 1 : seq !== 0 || state !== 0 || thumb)) {
        release(socket)
        return socket.close(1008, 'Invalid finger sequence; reconnect')
      }
      lastSeen = performance.now()
      latest = { type, state, thumb, seq, t }
      if (validScreen(message.screen)) {
        latestScreen = message.screen
        latest.screen = latestScreen
      }
      for (const peer of server.clients) {
        if (peer.role === 'trainer') send(peer, latest)
      }
    })
  })
  const timer = setInterval(() => {
    if (controller && performance.now() - lastSeen > 4000) {
      const stale = controller
      release(stale)
      stale.terminate()
    }
    status()
  }, 1000)
  server.on('close', () => clearInterval(timer))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = startRelay()
  server.on('listening', () => console.log('Finger relay listening on ws://0.0.0.0:8765'))
  server.on('error', error => { console.error(error.message); process.exitCode = 1; server.close() })
}
