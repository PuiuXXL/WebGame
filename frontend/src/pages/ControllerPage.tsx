import { useCallback, useEffect, useRef, useState } from 'react'
import { ControllerButton } from '../components/controller/ControllerButton'
import {
  createEmptyInputState,
  type InputKey,
  type ServerMessage,
} from '../realtime/protocol'
import { useRealtimeClient } from '../realtime/useRealtimeClient'

const statusLabels = {
  connecting: 'Se conectează…',
  connected: 'Conectat',
  disconnected: 'Deconectat',
  error: 'Eroare de conexiune',
} as const

export function ControllerPage() {
  const [inputs, setInputs] = useState(createEmptyInputState)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const activeInputsRef = useRef(new Set<InputKey>())

  const handleServerMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'error') {
      setServerMessage(message.message)
    }
  }, [])

  const { status, protocolError, sendInput } = useRealtimeClient(
    'controller',
    handleServerMessage,
  )

  const handleInputChange = useCallback(
    (key: InputKey, pressed: boolean) => {
      if (pressed) {
        activeInputsRef.current.add(key)
      } else {
        activeInputsRef.current.delete(key)
      }

      setInputs((currentInputs) => ({ ...currentInputs, [key]: pressed }))
      sendInput(key, pressed)
    },
    [sendInput],
  )

  useEffect(() => {
    function releaseAllInputs() {
      for (const key of activeInputsRef.current) {
        sendInput(key, false)
      }
      activeInputsRef.current.clear()
      setInputs(createEmptyInputState())
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        releaseAllInputs()
      }
    }

    window.addEventListener('blur', releaseAllInputs)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', releaseAllInputs)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sendInput])

  return (
    <main className="page controller-page">
      <h1>Controller</h1>
      <p className={`connection-status connection-status--${status}`}>
        Realtime: {statusLabels[status]}
      </p>

      <section className="controller-grid" aria-label="Game controller">
        <ControllerButton
          inputKey="left"
          label="LEFT"
          onInputChange={handleInputChange}
        />
        <ControllerButton
          inputKey="right"
          label="RIGHT"
          onInputChange={handleInputChange}
        />
        <ControllerButton
          inputKey="jump"
          label="JUMP"
          onInputChange={handleInputChange}
        />
        <ControllerButton
          inputKey="action"
          label="ACTION"
          onInputChange={handleInputChange}
        />
      </section>

      <output className="controller-output" aria-live="polite">
        Active: {activeInputLabels(inputs)}
      </output>

      {(protocolError || serverMessage) && (
        <p className="error-message">{protocolError || serverMessage}</p>
      )}
    </main>
  )
}

function activeInputLabels(inputs: Record<InputKey, boolean>) {
  const activeInputs = Object.entries(inputs)
    .filter(([, pressed]) => pressed)
    .map(([key]) => key.toUpperCase())

  return activeInputs.length > 0 ? activeInputs.join(' + ') : 'NONE'
}
