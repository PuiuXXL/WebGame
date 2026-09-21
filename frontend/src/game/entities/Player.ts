import Phaser from 'phaser'
import type { GameInput } from '../GameInput'

const MOVE_SPEED = 220
type Direction = 'left' | 'right' | 'up' | 'down'

export class Player {
  private readonly sprite: Phaser.Physics.Arcade.Sprite
  private currentDirection: Direction | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'cat-idle', 'idle-frame')
    this.setIdleAppearance()
    this.sprite.setCollideWorldBounds(true)
  }

  get gameObject() {
    return this.sprite
  }

  update(input: GameInput) {
    const horizontal = Number(input.isPressed('right')) - Number(input.isPressed('left'))
    const vertical = Number(input.isPressed('down')) - Number(input.isPressed('up'))
    const length = Math.hypot(horizontal, vertical)

    if (length === 0) {
      this.sprite.setVelocity(0, 0)
      if (this.currentDirection !== null) {
        this.currentDirection = null
        this.sprite.anims.stop()
        this.sprite.setTexture('cat-idle', 'idle-frame')
        this.setIdleAppearance()
      }
      return
    }

    this.sprite.setVelocity(
      (horizontal / length) * MOVE_SPEED,
      (vertical / length) * MOVE_SPEED,
    )

    const direction: Direction = horizontal < 0 ? 'left'
      : horizontal > 0 ? 'right'
      : vertical < 0 ? 'up'
      : 'down'

    if (direction !== this.currentDirection) {
      this.currentDirection = direction
      this.sprite.play(`cat-walk-${direction}`)
      if (direction === 'left' || direction === 'right') {
        this.sprite.setScale(0.5)
        this.sprite.body?.setSize(100, 60).setOffset(61, 260)
      } else {
        this.sprite.setScale(0.36)
        this.sprite.body?.setSize(139, 83).setOffset(42, 285)
      }
    }
  }

  private setIdleAppearance() {
    this.sprite.setScale(0.36)
    this.sprite.body?.setSize(139, 83).setOffset(90, 270)
  }
}
