import Phaser from 'phaser'
import { STANDS } from './campus'
import { GameBridge, GameState } from './bridge'
import { PALETTE, toNumber } from './palette'
import { BootScene } from './scenes/BootScene'
import { WorldScene } from './scenes/WorldScene'
import { TriviaScene } from './scenes/TriviaScene'
import type { InputKey } from '../realtime/protocol'

export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720

/** Desktop fallback so the game can be played and tested without a phone. */
const KEYBOARD_MAP: Record<string, InputKey> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'action',
  Enter: 'action',
}

export type GameHandle = {
  bridge: GameBridge
  /** Re-measures the parent, needed after the host element was hidden. */
  refresh: () => void
  destroy: () => void
}

export function createGame(parent: HTMLElement): GameHandle {
  const bridge = new GameBridge()
  const state = new GameState(STANDS.map((stand) => stand.id))

  const game: Phaser.Game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: toNumber(PALETTE.grassDark),
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    // The registry is the injection point: it is populated before any scene
    // boots, so scenes can read it in init() and a scene restart needs no data.
    callbacks: {
      preBoot: (instance) => {
        instance.registry.set('bridge', bridge)
        instance.registry.set('state', state)
      },
    },
    scene: [BootScene, WorldScene, TriviaScene],
  })

  function handleKeyDown(event: KeyboardEvent) {
    const key = KEYBOARD_MAP[event.code]
    if (!key) return
    event.preventDefault()
    bridge.setKey(key, true)
  }

  function handleKeyUp(event: KeyboardEvent) {
    const key = KEYBOARD_MAP[event.code]
    if (!key) return
    event.preventDefault()
    bridge.setKey(key, false)
  }

  function releaseAll() {
    bridge.releaseAll()
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', releaseAll)

  // Dev-only handles, so the game can be driven from the console or a test
  // harness. Stripped from the production build by the DEV guard.
  if (import.meta.env.DEV) {
    Object.assign(window, { __game: game, __bridge: bridge, __state: state })
  }

  return {
    bridge,
    refresh: () => {
      // refresh() uses cached parent dimensions; measure after unhiding first.
      game.scale.getParentBounds()
      game.scale.refresh()
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', releaseAll)
      game.destroy(true)
    },
  }
}
