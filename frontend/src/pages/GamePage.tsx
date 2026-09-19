import { useCallback, useState } from 'react'
import { ControllerQrCode } from '../components/ControllerQrCode'
import { getControllerUrl } from '../config/urls'
import {
  createEmptyInputState,
  INPUT_KEYS,
  type InputMessage,
  type ServerMessage,
} from '../realtime/protocol'
import { useRealtimeClient } from '../realtime/useRealtimeClient'

const statusLabels = {
  connecting: 'Se conectează…',
  connected: 'Conectat',
  disconnected: 'Deconectat',
  error: 'Eroare de conexiune',
} as const

export function GamePage() {
  const controllerUrl = getControllerUrl()
  const [inputs, setInputs] = useState(createEmptyInputState)
  const [controllerConnected, setControllerConnected] = useState(false)
  const [lastInput, setLastInput] = useState<InputMessage | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'input':
        setInputs((currentInputs) => ({
          ...currentInputs,
          [message.key]: message.pressed,
        }))
        setLastInput(message)
        break
      case 'input_reset':
        setInputs(createEmptyInputState())
        setLastInput(null)
        break
      case 'status':
        if (message.status === 'controller_connected') {
          setControllerConnected(true)
        }
        if (message.status === 'controller_disconnected') {
          setControllerConnected(false)
          setInputs(createEmptyInputState())
          setLastInput(null)
        }
        break
      case 'error':
        setServerError(message.message)
        break
    }
  }, [])

  const { status, protocolError } = useRealtimeClient(
    'game',
    handleServerMessage,
  )

  return (
    <main className="page game-page">
      <header className="game-header">
        <div>
          <h1>Game Screen</h1>
          <p className={`connection-status connection-status--${status}`}>
            Realtime: {statusLabels[status]}
          </p>
          <p>
            Controller: {controllerConnected ? 'conectat' : 'neconectat'}
          </p>
        </div>
        <ControllerQrCode url={controllerUrl} />
      </header>

      <section className="input-monitor" aria-labelledby="input-monitor-title">
        <h2 id="input-monitor-title">Input monitor</h2>
        <div className="input-state-grid">
          {INPUT_KEYS.map((key) => (
            <div
              className={`input-state${inputs[key] ? ' input-state--active' : ''}`}
              key={key}
            >
              <span>{key.toUpperCase()}</span>
              <strong>{String(inputs[key])}</strong>
            </div>
          ))}
        </div>
        <output className="last-input" aria-live="polite">
          {lastInput
            ? `Ultimul input: ${lastInput.key.toUpperCase()} — ${lastInput.pressed ? 'pressed' : 'released'}`
            : 'Nu a fost primit niciun input.'}
        </output>
      </section>

      {(protocolError || serverError) && (
        <p className="error-message">{protocolError || serverError}</p>
      )}
    </main>
  )
}
