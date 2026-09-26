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
  | 'rejected'

type RealtimeClientListeners = {
  onMessage: (message: ServerMessage) => void
  onStatusChange: (status: RealtimeConnectionStatus) => void
  onProtocolError: (message: string) => void
  onRejected?: (reason: string) => void
}

const POLICY_VIOLATION_CLOSE_CODE = 1008
const MAX_RECONNECT_DELAY_MS = 15_000

export class RealtimeClient {
  private socket: WebSocket | null = null
  private readonly role: ClientRole
  private readonly listeners: RealtimeClientListeners
  private session: string | null
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionallyClosed = false

  constructor(
    role: ClientRole,
    listeners: RealtimeClientListeners,
    session: string | null = null,
  ) {
    this.role = role
    this.listeners = listeners
    this.session = session
  }

  connect() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    this.intentionallyClosed = false
    this.listeners.onStatusChange('connecting')
    const socket = new WebSocket(getRealtimeUrl())
    this.socket = socket

    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0
      socket.send(
        JSON.stringify({
          type: 'join',
          role: this.role,
          ...(this.session ? { session: this.session } : {}),
        }),
      )
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

      // The game screen owns the pairing code: it must be replayed on reconnect so
      // the controller that is already paired stays paired.
      if (message.type === 'session' && this.role === 'game') {
        this.session = message.session
      }

      this.listeners.onMessage(message)
    })

    socket.addEventListener('error', () => {
      this.listeners.onStatusChange('error')
    })

    socket.addEventListener('close', (event) => {
      if (this.socket !== socket) {
        return
      }
      this.socket = null

      // The server refused this client on purpose - a stale pairing code, a bad
      // role. Retrying would just be refused again, so stop and surface why.
      if (event.code === POLICY_VIOLATION_CLOSE_CODE) {
        this.listeners.onStatusChange('rejected')
        this.listeners.onRejected?.(event.reason || 'Conexiunea a fost refuzată de server.')
        return
      }

      this.listeners.onStatusChange('disconnected')
      this.scheduleReconnect()
    })
  }

  /** Phones drop sockets constantly: screen lock, Wi-Fi handover, backgrounding. */
  private scheduleReconnect() {
    if (this.intentionallyClosed || this.reconnectTimer !== null) {
      return
    }

    const base = Math.min(500 * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS)
    const delay = base * (0.5 + Math.random() * 0.5)
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  /** Called when the tab comes back to the foreground, so recovery feels instant. */
  reconnectNow() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempt = 0
    this.connect()
  }

  sendInput(key: InputKey, pressed: boolean) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false
    }

    this.socket.send(JSON.stringify({ type: 'input', key, pressed }))
    return true
  }

  /** Game screen only: burn the current pairing code and get a fresh QR. */
  requestNewSession() {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false
    }

    this.socket.send(JSON.stringify({ type: 'new_session' }))
    return true
  }

  disconnect() {
    this.intentionallyClosed = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    const socket = this.socket
    this.socket = null
    socket?.close(1000, 'page closed')
  }
}
