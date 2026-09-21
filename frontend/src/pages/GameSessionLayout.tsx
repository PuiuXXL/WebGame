import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { GameInput } from '../game/GameInput'
import type { ServerMessage } from '../realtime/protocol'
import { useRealtimeClient } from '../realtime/useRealtimeClient'

export function GameSessionLayout() {
  const [controllerConnected, setControllerConnected] = useState(false)
  const [gameInput] = useState(() => new GameInput())
  const location = useLocation()
  const navigate = useNavigate()

  const handleServerMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'input') {
      const actionStarted = message.key === 'action' &&
        message.pressed &&
        !gameInput.isPressed('action')
      gameInput.set(message.key, message.pressed)

      if (actionStarted && controllerConnected && location.pathname === '/game/start') {
        navigate('/game/play', { replace: true })
      }
    } else if (message.type === 'input_reset') {
      gameInput.reset()
    } else if (message.type === 'status') {
      if (message.status === 'controller_connected') {
        setControllerConnected(true)
      } else if (message.status === 'controller_disconnected') {
        gameInput.reset()
        setControllerConnected(false)
      }
    }
  }, [controllerConnected, gameInput, location.pathname, navigate])

  const { status } = useRealtimeClient('game', handleServerMessage)

  useEffect(() => {
    const activeController = status === 'connected' && controllerConnected

    if (activeController && location.pathname === '/game') {
      navigate('/game/start', { replace: true })
    } else if (!activeController &&
      (location.pathname === '/game/start' || location.pathname === '/game/play')) {
      gameInput.reset()
      navigate('/game', { replace: true })
    }
  }, [controllerConnected, gameInput, location.pathname, navigate, status])

  return <Outlet context={gameInput} />
}
