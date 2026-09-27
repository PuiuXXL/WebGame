import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  disconnected: 'Reconectare…',
  error: 'Eroare de conexiune',
  rejected: 'Cod expirat',
} as const

export function ControllerPage() {
  const [searchParams] = useSearchParams()
  // The pairing code arrives in the QR link and never changes for this page load.
  const session = useMemo(() => searchParams.get('s'), [searchParams])

  const [inputs, setInputs] = useState(createEmptyInputState)
  const [gameConnected, setGameConnected] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const activeInputsRef = useRef(new Set<InputKey>())

  const handleServerMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'input_reset') {
      activeInputsRef.current.clear()
      setInputs(createEmptyInputState())
      return
    }
    if (message.type === 'error') {
      setServerMessage(message.message)
      return
    }
    if (message.type === 'status') {
      if (message.status === 'game_connected') setGameConnected(true)
      if (message.status === 'game_disconnected') setGameConnected(false)
    }
  }, [])

  const { status, protocolError, rejectionReason, sendInput, sendInputReset } = useRealtimeClient(
    'controller',
    handleServerMessage,
    session,
  )

  const live = status === 'connected'

  const handleInputChange = useCallback(
    (key: InputKey, pressed: boolean) => {
      if (pressed) {
        activeInputsRef.current.add(key)
      } else {
        if (!activeInputsRef.current.has(key)) {
          setInputs((currentInputs) => ({ ...currentInputs, [key]: false }))
          return
        }
        activeInputsRef.current.delete(key)
      }

      setInputs((currentInputs) => ({ ...currentInputs, [key]: pressed }))
      sendInput(key, pressed)
    },
    [sendInput],
  )

  useEffect(() => {
    function releaseAllInputs() {
      sendInputReset()
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
  }, [sendInputReset])

  if (!session) {
    return (
      <main className="page controller-page">
        <div className="controller-blocker">
          <h1>Scanează codul QR</h1>
          <p>
            Această pagină trebuie deschisă prin codul QR de pe ecranul jocului.
            Linkul trebuie să conțină codul de asociere.
          </p>
        </div>
      </main>
    )
  }

  if (status === 'rejected') {
    return (
      <main className="page controller-page">
        <div className="controller-blocker controller-blocker--error">
          <h1>Cod expirat</h1>
          <p>{rejectionReason ?? 'Codul de asociere nu mai este valid.'}</p>
          <p>Scanează din nou codul QR afișat pe ecranul jocului.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page controller-page">
      <header className="controller-header">
        <span className={`connection-status connection-status--${status}`}>
          {statusLabels[status]}
        </span>
        <span className="controller-header__game">
          {gameConnected ? 'Joc conectat' : 'Se așteaptă jocul…'}
        </span>
      </header>

      <section className="gamepad" aria-label="Controller joc">
        <div className="dpad">
          <ControllerButton
            inputKey="up"
            pressed={inputs.up}
            label="SUS"
            glyph="▲"
            variant="direction"
            disabled={!live}
            onInputChange={handleInputChange}
          />
          <ControllerButton
            inputKey="left"
            pressed={inputs.left}
            label="STÂNGA"
            glyph="◀"
            variant="direction"
            disabled={!live}
            onInputChange={handleInputChange}
          />
          <div className="dpad__center" aria-hidden="true" />
          <ControllerButton
            inputKey="right"
            pressed={inputs.right}
            label="DREAPTA"
            glyph="▶"
            variant="direction"
            disabled={!live}
            onInputChange={handleInputChange}
          />
          <ControllerButton
            inputKey="down"
            pressed={inputs.down}
            label="JOS"
            glyph="▼"
            variant="direction"
            disabled={!live}
            onInputChange={handleInputChange}
          />
        </div>

        <ControllerButton
          inputKey="action"
          pressed={inputs.action}
          label="ACȚIUNE"
          glyph="●"
          variant="action"
          disabled={!live}
          onInputChange={handleInputChange}
        />
      </section>

      <output className="controller-output" aria-live="polite">
        {activeInputLabels(inputs)}
      </output>

      {!live && (
        <p className="controller-hint">
          Butoanele sunt blocate până revine conexiunea.
        </p>
      )}

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

  return activeInputs.length > 0 ? activeInputs.join(' + ') : '—'
}
