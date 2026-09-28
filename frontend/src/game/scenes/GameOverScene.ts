import Phaser from 'phaser'
import type { GameBridge, GameState } from '../bridge'

// Optional until the artwork is added; Vite includes it in production when present.
const artwork = import.meta.glob<string>('./Gameover.png', {
  eager: true, query: '?url', import: 'default',
})

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover')
  }

  preload() {
    const url = Object.values(artwork)[0]
    if (url) this.load.image('gameover-art', url)
  }

  create() {
    const bridge = this.registry.get('bridge') as GameBridge
    const state = this.registry.get('state') as GameState
    bridge.releaseAll()
    this.cameras.main.setBackgroundColor('#111318')
    const { width, height } = this.scale
    if (this.textures.exists('gameover-art')) {
      const image = this.add.image(width / 2, height / 2, 'gameover-art')
      image.setScale(Math.min(width / image.width, height / image.height))
    }
    this.add.rectangle(width / 2, height - 115, width, 180, 0x111318, 0.88)
    this.add.text(width / 2, height - 160, 'Joc finalizat!', {
      fontFamily: 'Arial', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, height - 95,
      `Ai adunat ${state.medals} / ${state.targetMedals} medalii`, {
        fontFamily: 'Arial', fontSize: '28px', color: '#ffcb3d',
      }).setOrigin(0.5)
    bridge.publish({
      medals: state.medals, total: state.targetMedals,
      screen: 'gameover', nearStand: null, completed: true,
    })
  }
}
