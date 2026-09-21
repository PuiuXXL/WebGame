import Phaser from 'phaser'
import type { GameInput } from './GameInput'
import { GameScene } from './scenes/GameScene'

export function createGame(parent: HTMLElement, input: GameInput) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [new GameScene(input)],
  })
}
