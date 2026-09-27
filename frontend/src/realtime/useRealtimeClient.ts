import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RealtimeClient,
  type RealtimeConnectionStatus,
} from './RealtimeClient'
import type { ClientRole, InputKey, ServerMessage } from './protocol'

export function useRealtimeClient(
  role: ClientRole,
  onMessage: (message: ServerMessage) => void,
  session: string | null = null,
) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting')
  const [protocolError, setProtocolError] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const clientRef = useRef<RealtimeClient | null>(null)
  const messageHandlerRef = useRef(onMessage)

  useEffect(() => {
    messageHandlerRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let active = true
    const client = new RealtimeClient(
      role,
      {
        onMessage: (message) => messageHandlerRef.current(message),
        onStatusChange: (nextStatus) => {
          if (active) {
            setStatus(nextStatus)
            if (nextStatus !== 'connected') {
              messageHandlerRef.current({ type: 'input_reset' })
            }
          }
        },
        onProtocolError: (message) => {
          if (active) {
            setProtocolError(message)
          }
        },
        onRejected: (reason) => {
          if (active) {
            setRejectionReason(reason)
          }
        },
      },
      session,
    )

    clientRef.current = client
    client.connect()

    function handleVisibilityChange() {
      if (!document.hidden) {
        client.reconnectNow()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clientRef.current = null
      client.disconnect()
    }
  }, [role, session])

  const sendInput = useCallback((key: InputKey, pressed: boolean) => {
    return clientRef.current?.sendInput(key, pressed) ?? false
  }, [])

  const sendInputReset = useCallback(() => {
    return clientRef.current?.sendInputReset() ?? false
  }, [])

  const requestNewSession = useCallback(() => {
    return clientRef.current?.requestNewSession() ?? false
  }, [])

  return { status, protocolError, rejectionReason, sendInput, sendInputReset, requestNewSession }
}
