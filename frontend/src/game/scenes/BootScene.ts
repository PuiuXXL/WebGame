import Phaser from 'phaser'
import { BUILDINGS, GATES, STANDS } from '../campus'
import { createAllTextures, createCatAnimations } from '../textures'

/**
 * Nothing is loaded over the network: every texture is painted into a canvas
 * here, once, before the world starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create() {
    createAllTextures(this, BUILDINGS, STANDS, GATES)
    createCatAnimations(this)
    this.scene.start('world')
  }
}
