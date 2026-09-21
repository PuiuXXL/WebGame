import Phaser from 'phaser'
import type { GameInput } from '../GameInput'
import { createCatAnimations, preloadCatAssets } from '../catAnimations'
import { Player } from '../entities/Player'

export class GameScene extends Phaser.Scene {
  private readonly gameInput: GameInput
  private player?: Player

  constructor(gameInput: GameInput) {
    super('GameScene')
    this.gameInput = gameInput
  }

  preload() {
    preloadCatAssets(this)
  }

  create() {
    this.cameras.main.setBackgroundColor('#223449')
    createCatAnimations(this)

    this.player = new Player(this, 480, 270)

    this.add.text(24, 24, 'Scenă de probă — UP / DOWN / LEFT / RIGHT', {
      color: '#ffffff',
      fontSize: '24px',
    })
  }

  update() {
    this.player?.update(this.gameInput)
  }
}
