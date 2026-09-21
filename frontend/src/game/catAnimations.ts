import Phaser from 'phaser'
import catIdleImage from './assets/cat/cat-idle.png'
import catWalkLeftImage from './assets/cat/cat-walk-left-transparent.png'
import catWalkRightImage from './assets/cat/cat-walk_right-transparent.png'
import catWalkUpImage from './assets/cat/cat-walk-up-transparent.png'
import catWalkDownImage from './assets/cat/cat-walk-down-transparent.png'

const WALK_SHEETS = [
  {
    key: 'cat-walk-left',
    url: catWalkLeftImage,
    frameEdges: [0, 237, 443, 672, 888, 1100, 1328, 1548, 1774],
  },
  {
    key: 'cat-walk-right',
    url: catWalkRightImage,
    frameEdges: [0, 242, 460, 682, 895, 1109, 1331, 1551, 1774],
  },
  { key: 'cat-walk-up', url: catWalkUpImage },
  { key: 'cat-walk-down', url: catWalkDownImage },
] as const

const FRAME_COUNT = 8
const SHEET_WIDTH = 1774
const SHEET_HEIGHT = 887
const FRAME_TOP = 250
const FRAME_HEIGHT = 400

export function preloadCatAssets(scene: Phaser.Scene) {
  scene.load.image('cat-idle', catIdleImage)
  for (const sheet of WALK_SHEETS) {
    scene.load.image(sheet.key, sheet.url)
  }
}

export function createCatAnimations(scene: Phaser.Scene) {
  scene.textures.get('cat-idle').add('idle-frame', 0, 0, 340, 320, 360)

  for (const sheet of WALK_SHEETS) {
    const texture = scene.textures.get(sheet.key)
    if (texture.source[0].width !== SHEET_WIDTH || texture.source[0].height !== SHEET_HEIGHT) {
      throw new Error(`Unexpected dimensions for ${sheet.key}`)
    }

    // The side-view cats are not spaced at exact eighths of the image.
    const edges: readonly number[] = 'frameEdges' in sheet
      ? sheet.frameEdges
      : Array.from({ length: FRAME_COUNT + 1 }, (_, edge) =>
          Math.round((edge * SHEET_WIDTH) / FRAME_COUNT),
        )

    const frames = Array.from({ length: FRAME_COUNT }, (_, index) => {
      const left = edges[index]
      const right = edges[index + 1]
      const frame = `frame-${index}`
      texture.add(frame, 0, left, FRAME_TOP, right - left, FRAME_HEIGHT)
      return { key: sheet.key, frame }
    })

    scene.anims.create({
      key: sheet.key,
      frames,
      frameRate: 10,
      repeat: -1,
    })
  }
}
