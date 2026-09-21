import { useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { createGame } from '../game/createGame'
import type { GameInput } from '../game/GameInput'

export function PlayingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const input = useOutletContext<GameInput>()

  useEffect(() => {
    if (!containerRef.current) return

    const game = createGame(containerRef.current, input)
    return () => {
      game.destroy(true)
    }
  }, [input])

  return <main className="playing-page" ref={containerRef} aria-label="Pisica și Umbrele" />
}
