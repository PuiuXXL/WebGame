import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GameStartPage } from './GameStartPage'
import { ControllerQrCode } from '../components/ControllerQrCode'
import { getControllerUrl, isLoopbackOrigin } from '../config/urls'
import type { ServerMessage } from '../realtime/protocol'
import { useRealtimeClient } from '../realtime/useRealtimeClient'
import { createGame, type GameHandle } from '../game'
import {
  SPEED_SCALE_DEFAULT,
  SPEED_SCALE_MAX,
  SPEED_SCALE_MIN,
  loadSpeedScale,
} from '../game/bridge'
import type { GameStatus } from '../game/bridge'

const statusLabels = {
  connecting: 'Se conectează…',
  connected: 'Conectat',
  disconnected: 'Deconectat',
  error: 'Eroare de conexiune',
  rejected: 'Refuzat',
} as const

type Phase = 'lobby' | 'start' | 'playing'

const EMPTY_STATUS: GameStatus = {
  medals: 0,
  total: 0,
  screen: 'world',
  nearStand: null,
  completed: false,
}

export function GamePage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const phase: Phase = pathname === '/game/start' ? 'start'
    : pathname === '/game/play' ? 'playing' : 'lobby'
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next
    navigate(next === 'lobby' ? '/game' : next === 'start' ? '/game/start' : '/game/play', { replace: true })
  }, [navigate])
  // Mirrors bridge.speedScale purely so the slider and its readout render; the
  // game loop reads the bridge, never this.
  const [speedScale, setSpeedScale] = useState(loadSpeedScale)
  const [session, setSession] = useState<string | null>(null)
  const [controllerConnected, setControllerConnected] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>(EMPTY_STATUS)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<GameHandle | null>(null)

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'input':
        if (phaseRef.current === 'start' && message.key === 'action' && message.pressed) {
          setPhase('playing')
        } else if (phaseRef.current === 'playing') {
          gameRef.current?.bridge.setKey(message.key, message.pressed)
        }
        break
      case 'input_reset':
        gameRef.current?.bridge.releaseAll()
        break
      case 'session':
        setSession(message.session)
        break
      case 'status':
        if (message.status === 'controller_connected') {
          setControllerConnected(true)
          if (phaseRef.current === 'lobby') setPhase('start')
        }
        if (message.status === 'controller_disconnected') {
          setControllerConnected(false)
          gameRef.current?.bridge.releaseAll()
        }
        break
      case 'error':
        setServerError(message.message)
        break
    }
  }, [setPhase])

  const { status, protocolError, requestNewSession } = useRealtimeClient(
    'game',
    handleServerMessage,
  )

  /**
   * The canvas host stays mounted for the whole page life. Unmounting it when the
   * lobby comes back would orphan the canvas Phaser appended to it, so the run is
   * simply hidden instead - and picked up again exactly where it was left.
   */
  useEffect(() => {
    if (phase !== 'playing' || (!controllerConnected && !gameStarted)) {
      gameRef.current?.setActive(false)
      return
    }

    if (!gameRef.current && containerRef.current) {
      gameRef.current = createGame(containerRef.current)
      setGameStarted(true)
    }

    // The host was display:none while in the lobby, so its measured size was zero.
    gameRef.current?.setActive(true)
    gameRef.current?.refresh()
  }, [phase, controllerConnected, gameStarted])

  useEffect(() => {
    return () => {
      gameRef.current?.destroy()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!gameStarted) {
      return
    }
    const bridge = gameRef.current?.bridge
    return bridge?.onStatus(setGameStatus)
  }, [gameStarted])

  const handleNewCode = useCallback(() => {
    if (!requestNewSession()) return
    setSession(null)
    setControllerConnected(false)
    gameRef.current?.bridge.releaseAll()
    setPhase('lobby')
  }, [requestNewSession, setPhase])

  const handleReset = useCallback(() => {
    gameRef.current?.bridge.requestReset()
  }, [])

  const changeSpeed = useCallback((value: number) => {
    setSpeedScale(value)
    gameRef.current?.bridge.setSpeedScale(value)
  }, [])

  // The game may not exist yet when the page loads, so hand it the stored
  // setting once it does.
  useEffect(() => {
    gameRef.current?.bridge.setSpeedScale(speedScale)
  }, [gameStarted, speedScale])

  useEffect(() => {
    if (status !== 'connected') {
      gameRef.current?.bridge.releaseAll()
    }
  }, [status])

  // A refreshed/direct start or play URL has no paired controller yet.
  useEffect(() => {
    const knownPath = ['/game', '/game/', '/game/start', '/game/play'].includes(pathname)
    if (!knownPath || (session && !controllerConnected && !gameStarted && phase !== 'lobby')) {
      setPhase('lobby')
    }
  }, [pathname, session, controllerConnected, gameStarted, phase, setPhase])

  const playing = phase === 'playing'

  return (
    <main className={`page game-shell${playing ? ' game-shell--playing' : ''}`}>
      {playing && (
        <header className="game-bar">
          <div className="game-bar__medals">
            <span className="game-bar__count">
              {gameStatus.medals} / {gameStatus.total}
            </span>
            <span className="game-bar__label">medalii</span>
          </div>

          <div className="game-bar__state">
            <span className={`connection-status connection-status--${status}`}>
              {statusLabels[status]}
            </span>
            <span>
              {controllerConnected && status === 'connected' ? 'Controller conectat' : 'Controller deconectat'}
            </span>
            {gameStatus.nearStand && (
              <span className="game-bar__near">La: {gameStatus.nearStand}</span>
            )}
          </div>

          <label className="game-bar__speed">
            <span className="game-bar__speed-label">Viteză</span>
            <input
              type="range"
              min={SPEED_SCALE_MIN}
              max={SPEED_SCALE_MAX}
              step={0.1}
              value={speedScale}
              onChange={(event) => changeSpeed(Number(event.target.value))}
            />
            <output className="game-bar__speed-value">{speedScale.toFixed(1)}×</output>
            <button
              type="button"
              className="ghost-button ghost-button--tiny"
              onClick={() => changeSpeed(SPEED_SCALE_DEFAULT)}
              disabled={speedScale === SPEED_SCALE_DEFAULT}
            >
              Normal
            </button>
          </label>

          <div className="game-bar__actions">
            <button type="button" className="ghost-button" onClick={handleReset}>
              Reset joc
            </button>
            <button type="button" className="ghost-button" onClick={handleNewCode}>
              Cod nou (QR)
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setPhase('lobby')}
            >
              Ecran conectare
            </button>
          </div>
        </header>
      )}

      <div className="game-canvas" ref={containerRef} hidden={!playing} />

      {playing && gameStatus.completed && (
        <div className="game-complete">
          <h2>Ai strâns toate medaliile!</h2>
          <p>Apasă „Reset joc” pentru încă o tură.</p>
        </div>
      )}

      {playing && (!controllerConnected || status !== 'connected') && (
        <p className="game-shell__notice">
          Controllerul s-a deconectat. Apasă „Cod nou (QR)” ca să conectezi alt telefon.
        </p>
      )}

      {phase === 'start' && (
        <>
          <GameStartPage />
          <div className="game-start-controls">
            <p>{controllerConnected && status === 'connected'
              ? 'Apasă ACȚIUNE pe telefon pentru a începe.'
              : 'Controller deconectat. Reconectează telefonul sau generează un cod nou.'}</p>
            <button type="button" className="ghost-button" onClick={handleNewCode}>
              Cod nou (QR)
            </button>
          </div>
        </>
      )}

      {phase === 'lobby' && (
        <div className="lobby">
          <div className="lobby__intro">
            <p className="lobby__eyebrow">OSUT · UTCN Observator</p>
            <h1>Pisica din campus</h1>
            <p className="lobby__lead">
              Scanează codul cu telefonul ca să primești controllerul. Plimbă pisica
              prin campus, oprește-te la standurile OSUT și răspunde corect ca să
              strângi toate medaliile.
            </p>
            <p className={`connection-status connection-status--${status}`}>
              Server: {statusLabels[status]}
            </p>
            {isLoopbackOrigin() && (
              <p className="lobby__warning">
                Adresa din codul QR indică <strong>localhost</strong>. Configurează
                VITE_PUBLIC_APP_URL în .env cu adresa accesibilă telefonului.
              </p>
            )}
          </div>

          <div className="lobby__qr">
            {session ? (
              <ControllerQrCode url={getControllerUrl(session)} />
            ) : (
              <p className="lobby__pending">Se generează codul de asociere…</p>
            )}
            <div className="lobby__actions">
              <button type="button" className="ghost-button" onClick={handleNewCode}>
                Cod nou
              </button>
              {gameStarted && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPhase('playing')}
                >
                  Înapoi la joc
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(protocolError || serverError) && (
        <p className="error-message">{protocolError || serverError}</p>
      )}
    </main>
  )
}
