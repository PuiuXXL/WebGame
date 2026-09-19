import { getRealtimeUrl } from '../config/urls'
import {
  parseServerMessage,
  type ClientRole,
  type InputKey,
  type ServerMessage,
} from './protocol'

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

type RealtimeClientListeners = {
  onMessage: (message: ServerMessage) => void
  onStatusChange: (status: RealtimeConnectionStatus) => void
  onProtocolError: (message: string) => void
}

export class RealtimeClient {
  private socket: WebSocket | null = null
  private readonly role: ClientRole
  private readonly listeners: RealtimeClientListeners

  constructor(role: ClientRole, listeners: RealtimeClientListeners) {
    this.role = role
    this.listeners = listeners
  }

  connect() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    this.listeners.onStatusChange('connecting')
    const socket = new WebSocket(getRealtimeUrl())
    this.socket = socket

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'join', role: this.role }))
      this.listeners.onStatusChange('connected')
    })

    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        this.listeners.onProtocolError('Serverul a trimis un mesaj care nu este text.')
        return
      }

      const message = parseServerMessage(event.data)
      if (message === null) {
        this.listeners.onProtocolError('Serverul a trimis un mesaj JSON invalid.')
        return
      }

      this.listeners.onMessage(message)
    })

    socket.addEventListener('error', () => {
      this.listeners.onStatusChange('error')
    })

    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null
        this.listeners.onStatusChange('disconnected')
      }
    })
  }

  sendInput(key: InputKey, pressed: boolean) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false
    }

    this.socket.send(JSON.stringify({ type: 'input', key, pressed }))
    return true
  }

  disconnect() {
    const socket = this.socket
    this.socket = null
    socket?.close(1000, 'page closed')
  }
}
