import { createEmptyInputState, type InputKey, type InputState } from '../realtime/protocol.ts'

const MIN_TAP_MS = 90
const MIN_UNSAMPLED_PULSE_MS = 50

export class GameInput {
  private state: InputState = createEmptyInputState()
  private pressedAt: Partial<Record<InputKey, number>> = {}
  private sampledWhilePressed: Partial<Record<InputKey, boolean>> = {}
  private tapUntil: Partial<Record<InputKey, number>> = {}
  private readonly now: () => number

  constructor(now: () => number = () => performance.now()) {
    this.now = now
  }

  set(key: InputKey, pressed: boolean) {
    if (pressed && !this.state[key]) {
      this.pressedAt[key] = this.now()
      this.sampledWhilePressed[key] = false
    } else if (!pressed && this.state[key] && key !== 'action') {
      const now = this.now()
      const heldFor = now - (this.pressedAt[key] ?? now)
      const extraTime = Math.max(
        0,
        MIN_TAP_MS - heldFor,
        this.sampledWhilePressed[key] ? 0 : MIN_UNSAMPLED_PULSE_MS,
      )
      this.tapUntil[key] = Math.max(this.tapUntil[key] ?? 0, now) + extraTime
    }

    this.state[key] = pressed
  }

  isPressed(key: InputKey) {
    if (this.state[key]) {
      this.sampledWhilePressed[key] = true
      return true
    }

    return key !== 'action' && this.now() < (this.tapUntil[key] ?? 0)
  }

  reset() {
    this.state = createEmptyInputState()
    this.pressedAt = {}
    this.sampledWhilePressed = {}
    this.tapUntil = {}
  }
}
