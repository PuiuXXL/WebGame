import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RealtimeClient,
  type RealtimeConnectionStatus,
} from './RealtimeClient'
import type { ClientRole, InputKey, ServerMessage } from './protocol'

export function useRealtimeClient(
  role: ClientRole,
  onMessage: (message: ServerMessage) => void,
) {
  const [status, setStatus] =
    useState<RealtimeConnectionStatus>('connecting')
  const [protocolError, setProtocolError] = useState<string | null>(null)
  const clientRef = useRef<RealtimeClient | null>(null)
  const messageHandlerRef = useRef(onMessage)

  useEffect(() => {
    messageHandlerRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let active = true
    const client = new RealtimeClient(role, {
      onMessage: (message) => messageHandlerRef.current(message),
      onStatusChange: (nextStatus) => {
        if (active) {
          setStatus(nextStatus)
        }
      },
      onProtocolError: (message) => {
        if (active) {
          setProtocolError(message)
        }
      },
    })

    clientRef.current = client
    client.connect()

    return () => {
      active = false
      clientRef.current = null
      client.disconnect()
    }
  }, [role])

  const sendInput = useCallback((key: InputKey, pressed: boolean) => {
    return clientRef.current?.sendInput(key, pressed) ?? false
  }, [])

  const sendInputReset = useCallback(() => {
    return clientRef.current?.sendInputReset() ?? false
  }, [])

  return { status, protocolError, sendInput, sendInputReset }
}
