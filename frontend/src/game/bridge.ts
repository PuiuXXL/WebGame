import type { InputKey } from '../realtime/protocol'
import type { StandId } from './campus'

/**
 * The seam between React and Phaser.
 *
 * Input is a plain mutable object, not React state: the socket writes into it
 * and the game loop reads it every frame. Pushing 60 inputs a second through
 * setState would spend the frame budget on reconciliation instead of the game.
 *
 * Only coarse status - medal count, which screen is up - travels back to React,
 * and only when it actually changes.
 */

const EMPTY_EDGES: ReadonlySet<InputKey> = new Set()

export type GameScreen = 'world' | 'trivia'

/** How fast the cat walks, as a multiple of the base speed. */
export const SPEED_SCALE_MIN = 0.4
export const SPEED_SCALE_MAX = 2.5
export const SPEED_SCALE_DEFAULT = 1

const SPEED_STORAGE_KEY = 'pisica:speed-scale'

export function clampSpeedScale(value: number) {
  if (!Number.isFinite(value)) return SPEED_SCALE_DEFAULT
  return Math.min(SPEED_SCALE_MAX, Math.max(SPEED_SCALE_MIN, value))
}

/**
 * The setting outlives the tab, but never at the cost of starting the game:
 * storage throws in a private window and comes back empty after a clear, so a
 * failure here just means the default speed.
 */
export function loadSpeedScale() {
  try {
    const stored = localStorage.getItem(SPEED_STORAGE_KEY)
    return stored === null ? SPEED_SCALE_DEFAULT : clampSpeedScale(Number(stored))
  } catch {
    return SPEED_SCALE_DEFAULT
  }
}

export function saveSpeedScale(value: number) {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, String(value))
  } catch {
    // A setting that cannot be remembered is not a reason to stop playing.
  }
}

export type GameStatus = {
  medals: number
  total: number
  screen: GameScreen
  nearStand: string | null
  completed: boolean
}

type StatusListener = (status: GameStatus) => void

export class GameBridge {
  readonly input: Record<InputKey, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  }

  /**
   * Read by the game loop every frame, like `input`. Not React state: the
   * slider would otherwise re-render the page on every pixel of drag.
   */
  speedScale = loadSpeedScale()

  private pressedEdges = new Set<InputKey>()
  private listeners = new Set<StatusListener>()
  private resetHandler: (() => void) | null = null

  status: GameStatus = {
    medals: 0,
    total: 0,
    screen: 'world',
    nearStand: null,
    completed: false,
  }

  setKey(key: InputKey, pressed: boolean) {
    if (pressed && !this.input[key]) {
      this.pressedEdges.add(key)
    }
    this.input[key] = pressed
  }

  releaseAll() {
    for (const key of Object.keys(this.input) as InputKey[]) {
      this.input[key] = false
    }
    this.pressedEdges.clear()
  }

  /**
   * Edges are consumed, not polled: a menu selection must fire once per press,
   * however many frames the button is held. Only the active scene consumes them,
   * because the paused scene's update never runs.
   */
  consumeEdges(): ReadonlySet<InputKey> {
    if (this.pressedEdges.size === 0) {
      return EMPTY_EDGES
    }
    const edges = new Set(this.pressedEdges)
    this.pressedEdges.clear()
    return edges
  }

  onStatus(listener: StatusListener) {
    this.listeners.add(listener)
    listener(this.status)
    return () => {
      this.listeners.delete(listener)
    }
  }

  publish(patch: Partial<GameStatus>) {
    const next = { ...this.status, ...patch }
    const unchanged =
      next.medals === this.status.medals &&
      next.total === this.status.total &&
      next.screen === this.status.screen &&
      next.nearStand === this.status.nearStand &&
      next.completed === this.status.completed
    if (unchanged) {
      return
    }
    this.status = next
    for (const listener of this.listeners) {
      listener(next)
    }
  }

  setSpeedScale(value: number) {
    this.speedScale = clampSpeedScale(value)
    saveSpeedScale(this.speedScale)
  }

  setResetHandler(handler: (() => void) | null) {
    this.resetHandler = handler
  }

  requestReset() {
    this.releaseAll()
    this.resetHandler?.()
  }
}

/** Per-stand progress. Wrong answers stay marked for the whole run. */
export type StandProgress = {
  solved: boolean
  wrongAnswers: Set<number>
  cooldownUntil: number
  hintRevealed: boolean
}

export class GameState {
  readonly progress = new Map<StandId, StandProgress>()

  constructor(standIds: StandId[]) {
    this.reset(standIds)
  }

  reset(standIds: StandId[]) {
    this.progress.clear()
    for (const id of standIds) {
      this.progress.set(id, {
        solved: false,
        wrongAnswers: new Set(),
        cooldownUntil: 0,
        hintRevealed: false,
      })
    }
  }

  get(id: StandId): StandProgress {
    const entry = this.progress.get(id)
    if (!entry) {
      throw new Error(`unknown stand "${id}"`)
    }
    return entry
  }

  get medals() {
    let count = 0
    for (const entry of this.progress.values()) {
      if (entry.solved) {
        count += 1
      }
    }
    return count
  }

  isCoolingDown(id: StandId, now: number) {
    return this.get(id).cooldownUntil > now
  }

  remainingCooldown(id: StandId, now: number) {
    return Math.max(0, this.get(id).cooldownUntil - now)
  }
}
