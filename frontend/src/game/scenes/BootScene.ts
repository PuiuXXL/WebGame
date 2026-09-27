import Phaser from 'phaser'
import { BUILDINGS, GATES, STANDS } from '../campus'
import { createAllTextures } from '../textures'
import { createCatAnimations, preloadCatAssets } from '../catAnimations'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    preloadCatAssets(this)
  }

  create() {
    createAllTextures(this, BUILDINGS, STANDS, GATES)
    createCatAnimations(this)
    this.scene.start('world')
  }
}
