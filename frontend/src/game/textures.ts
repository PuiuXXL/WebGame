import Phaser from 'phaser'
import { INK, PALETTE, STAND_COLORS } from './palette'
import {
  DEFAULT_GATE_SIGN,
  WALL_HEIGHT,
  type Building,
  type BuildingPart,
  type Gate,
} from './campus'

/**
 * Every pixel in this game is drawn here, with the Canvas 2D API, at boot.
 *
 * The look is deliberate: chunky silhouettes, one dark ink outline on
 * everything, two-tone shading (a warm light from the top-left, a cool shadow
 * bottom-right) and no gradients except where a surface needs to read as
 * curved. That is what keeps it cartoon rather than mush - shapes are built
 * from a few large forms instead of many small noisy ones.
 */

const OUTLINE = 3.5
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

type Ctx = CanvasRenderingContext2D

function canvasTexture(scene: Phaser.Scene, key: string, width: number, height: number) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key)
  }
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) {
    throw new Error(`could not create canvas texture "${key}"`)
  }
  return texture
}

function paint(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx) => void,
) {
  const texture = canvasTexture(scene, key, width, height)
  const ctx = texture.getContext()
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  draw(ctx)
  ctx.restore()
  texture.refresh()
}

function inked(ctx: Ctx, fill: string, width = OUTLINE) {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = width
  ctx.stroke()
}

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2)
  ctx.closePath()
}

function groundShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(30, 40, 25, 0.22)'
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Deterministic pseudo-random so textures look organic but never change between runs. */
function noise(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

/**
 * A closed wobbly blob. Foliage drawn as a plain circle reads as a bubble; a
 * blob with a handful of asymmetric bumps reads as leaves.
 */
function blob(ctx: Ctx, cx: number, cy: number, radius: number, bumps: number, seed: number) {
  const random = noise(seed)
  const offsets = Array.from({ length: bumps }, () => 0.78 + random() * 0.42)
  ctx.beginPath()
  for (let index = 0; index <= bumps; index += 1) {
    const step = index % bumps
    const next = (index + 1) % bumps
    const angle = (step / bumps) * Math.PI * 2
    const nextAngle = ((step + 1) / bumps) * Math.PI * 2
    const r = radius * offsets[step]
    const nextR = radius * offsets[next]
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r * 0.86
    const nx = cx + Math.cos(nextAngle) * nextR
    const ny = cy + Math.sin(nextAngle) * nextR * 0.86
    const midAngle = (angle + nextAngle) / 2
    const midR = radius * ((offsets[step] + offsets[next]) / 2) * 1.14
    const cxp = cx + Math.cos(midAngle) * midR
    const cyp = cy + Math.sin(midAngle) * midR * 0.86
    if (index === 0) {
      ctx.moveTo(x, y)
    }
    ctx.quadraticCurveTo(cxp, cyp, nx, ny)
  }
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

/** A seamless grass tile: base wash, mown bands, scattered blades and clover. */
function paintGrass(scene: Phaser.Scene) {
  const size = 256
  paint(scene, 'grass', size, size, (ctx) => {
    ctx.fillStyle = PALETTE.grass
    ctx.fillRect(0, 0, size, size)

    // Broad mown bands give the lawn a direction without any visible tiling seam.
    ctx.fillStyle = PALETTE.grassMid
    for (let y = 0; y < size; y += 64) {
      ctx.fillRect(0, y, size, 32)
    }

    const random = noise(7)
    ctx.strokeStyle = PALETTE.grassDark
    ctx.lineWidth = 2
    for (let index = 0; index < 220; index += 1) {
      const x = random() * size
      const y = random() * size
      const height = 3 + random() * 5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 2, y - height * 0.6, x + 1, y - height)
      ctx.stroke()
    }

    ctx.strokeStyle = PALETTE.grassLight
    for (let index = 0; index < 150; index += 1) {
      const x = random() * size
      const y = random() * size
      const height = 3 + random() * 4
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x - 2, y - height * 0.6, x - 1, y - height)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(255, 246, 180, 0.55)'
    for (let index = 0; index < 26; index += 1) {
      ctx.beginPath()
      ctx.arc(random() * size, random() * size, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// ---------------------------------------------------------------------------
// The cat
// ---------------------------------------------------------------------------

export type CatDirection = 'down' | 'up' | 'left' | 'right'

const CAT_SIZE = 72
const BOB = [0, -1.6, 0, 1.2]
const SWING = [0, 1, 0, -1]
const TAIL = [0, 1.1, 0, -1.1]

function catTail(ctx: Ctx, fromX: number, fromY: number, sway: number, flip = 1) {
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = 13
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(
    fromX + 18 * flip,
    fromY + 4 + sway * 3,
    fromX + 20 * flip,
    fromY - 16 + sway * 5,
  )
  ctx.stroke()

  ctx.strokeStyle = PALETTE.catFur
  ctx.lineWidth = 8
  ctx.stroke()

  // Tail tip in the light fur tone so it stays readable against the body.
  ctx.strokeStyle = PALETTE.catFurLight
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(fromX + 19 * flip, fromY - 8 + sway * 4)
  ctx.lineTo(fromX + 20 * flip, fromY - 16 + sway * 5)
  ctx.stroke()
  ctx.restore()
}

function catPaw(ctx: Ctx, x: number, y: number) {
  ellipse(ctx, x, y, 5.5, 4.2)
  inked(ctx, PALETTE.catCream, 2.6)
}

function catBodyStripes(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.strokeStyle = PALETTE.catFurDark
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  for (let index = -1; index <= 1; index += 1) {
    const offset = cy + index * 8
    ctx.beginPath()
    ctx.moveTo(cx - rx, offset)
    ctx.quadraticCurveTo(cx, offset - 4, cx + rx, offset)
    ctx.stroke()
  }
  ctx.restore()
}

function catEars(ctx: Ctx, cx: number, cy: number, inner: boolean) {
  const draw = (sign: number) => {
    ctx.beginPath()
    ctx.moveTo(cx + sign * 5, cy - 8)
    ctx.lineTo(cx + sign * 15, cy - 20)
    ctx.lineTo(cx + sign * 17.5, cy - 4)
    ctx.closePath()
    inked(ctx, PALETTE.catFur, 3)

    if (inner) {
      ctx.beginPath()
      ctx.moveTo(cx + sign * 8, cy - 9)
      ctx.lineTo(cx + sign * 13.5, cy - 16)
      ctx.lineTo(cx + sign * 14.5, cy - 7)
      ctx.closePath()
      ctx.fillStyle = PALETTE.catNose
      ctx.fill()
    }
  }
  draw(-1)
  draw(1)
}

function paintCatDown(ctx: Ctx, frame: number) {
  const bob = BOB[frame]
  const swing = SWING[frame]
  const cx = CAT_SIZE / 2

  groundShadow(ctx, cx, 62, 19, 6)
  catTail(ctx, cx + 11, 46 + bob, TAIL[frame])

  // Back paws swing out of phase so the walk reads even at small scale.
  catPaw(ctx, cx - 11 + swing * 2.5, 56 + bob - Math.abs(swing) * 1.5)
  catPaw(ctx, cx + 11 - swing * 2.5, 56 + bob + Math.abs(swing) * 1.5)

  ellipse(ctx, cx, 45 + bob, 15, 13)
  inked(ctx, PALETTE.catFur)
  catBodyStripes(ctx, cx, 45 + bob, 15, 13)

  ellipse(ctx, cx, 49 + bob, 8, 8)
  ctx.fillStyle = PALETTE.catCream
  ctx.fill()

  catPaw(ctx, cx - 8 - swing * 2, 55 + bob)
  catPaw(ctx, cx + 8 + swing * 2, 55 + bob)

  catEars(ctx, cx, 27 + bob, true)
  ellipse(ctx, cx, 28 + bob, 16, 14.5)
  inked(ctx, PALETTE.catFur)

  // Muzzle
  ellipse(ctx, cx, 34 + bob, 9.5, 6.5)
  ctx.fillStyle = PALETTE.catCream
  ctx.fill()

  // Forehead stripes
  ctx.strokeStyle = PALETTE.catFurDark
  ctx.lineWidth = 3
  for (let index = -1; index <= 1; index += 1) {
    ctx.beginPath()
    ctx.moveTo(cx + index * 5, 17 + bob)
    ctx.lineTo(cx + index * 6.5, 23 + bob)
    ctx.stroke()
  }

  // Eyes with a highlight each, which is most of what makes it look alive.
  for (const sign of [-1, 1]) {
    ellipse(ctx, cx + sign * 6.5, 28 + bob, 3.4, 4)
    ctx.fillStyle = PALETTE.catEye
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + sign * 6.5, 28 + bob, 1.2, 3, 0, 0, Math.PI * 2)
    ctx.fillStyle = INK
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + sign * 7.6, 26.4 + bob, 1.1, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }

  ctx.beginPath()
  ctx.moveTo(cx - 2.6, 32 + bob)
  ctx.lineTo(cx + 2.6, 32 + bob)
  ctx.lineTo(cx, 34.6 + bob)
  ctx.closePath()
  ctx.fillStyle = PALETTE.catNose
  ctx.fill()

  ctx.strokeStyle = INK
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(cx, 34.6 + bob)
  ctx.lineTo(cx, 36.5 + bob)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(42, 33, 53, 0.55)'
  ctx.lineWidth = 1.4
  for (const sign of [-1, 1]) {
    for (let index = 0; index < 2; index += 1) {
      ctx.beginPath()
      ctx.moveTo(cx + sign * 8, 33 + index * 3 + bob)
      ctx.lineTo(cx + sign * 20, 30 + index * 5 + bob)
      ctx.stroke()
    }
  }
}

function paintCatUp(ctx: Ctx, frame: number) {
  const bob = BOB[frame]
  const swing = SWING[frame]
  const cx = CAT_SIZE / 2

  groundShadow(ctx, cx, 62, 19, 6)

  catPaw(ctx, cx - 11 + swing * 2.5, 56 + bob)
  catPaw(ctx, cx + 11 - swing * 2.5, 56 + bob)

  ellipse(ctx, cx, 45 + bob, 15, 13)
  inked(ctx, PALETTE.catFur)
  catBodyStripes(ctx, cx, 45 + bob, 15, 13)

  // From behind the tail sits on top of the body.
  catTail(ctx, cx + 2, 44 + bob, TAIL[frame])

  catEars(ctx, cx, 27 + bob, false)
  ellipse(ctx, cx, 28 + bob, 16, 14.5)
  inked(ctx, PALETTE.catFur)

  ctx.strokeStyle = PALETTE.catFurDark
  ctx.lineWidth = 3.4
  for (let index = -1; index <= 1; index += 1) {
    ctx.beginPath()
    ctx.moveTo(cx + index * 6, 18 + bob)
    ctx.quadraticCurveTo(cx + index * 7.5, 26 + bob, cx + index * 6, 34 + bob)
    ctx.stroke()
  }
}

function paintCatSide(ctx: Ctx, frame: number) {
  const bob = BOB[frame]
  const swing = SWING[frame]

  groundShadow(ctx, 36, 62, 20, 6)
  catTail(ctx, 20, 44 + bob, TAIL[frame], -1)

  // Far side legs, darkened so the near ones read in front.
  ctx.save()
  ctx.globalAlpha = 0.85
  ellipse(ctx, 26 - swing * 4, 56 + bob, 5.5, 4.4)
  inked(ctx, PALETTE.catFurDark, 2.4)
  ellipse(ctx, 44 + swing * 4, 56 + bob, 5.5, 4.4)
  inked(ctx, PALETTE.catFurDark, 2.4)
  ctx.restore()

  ellipse(ctx, 33, 45 + bob, 17, 12)
  inked(ctx, PALETTE.catFur)
  catBodyStripes(ctx, 33, 45 + bob, 17, 12)

  catPaw(ctx, 24 + swing * 4, 56 + bob)
  catPaw(ctx, 42 - swing * 4, 56 + bob)

  // Head, pushed forward and slightly up: reads as "looking where it walks".
  ctx.beginPath()
  ctx.moveTo(44, 24 + bob)
  ctx.lineTo(51, 13 + bob)
  ctx.lineTo(54, 26 + bob)
  ctx.closePath()
  inked(ctx, PALETTE.catFur, 3)

  ctx.beginPath()
  ctx.moveTo(36, 25 + bob)
  ctx.lineTo(40, 14 + bob)
  ctx.lineTo(45, 25 + bob)
  ctx.closePath()
  inked(ctx, PALETTE.catFurDark, 3)

  ellipse(ctx, 46, 31 + bob, 14, 13)
  inked(ctx, PALETTE.catFur)

  ellipse(ctx, 55, 35 + bob, 7, 5.5)
  ctx.fillStyle = PALETTE.catCream
  ctx.fill()

  ellipse(ctx, 49, 30 + bob, 3.2, 4)
  ctx.fillStyle = PALETTE.catEye
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(49, 30 + bob, 1.2, 3, 0, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()
  ctx.beginPath()
  ctx.arc(50.2, 28.6 + bob, 1, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(60, 33.5 + bob, 2, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.catNose
  ctx.fill()

  ctx.strokeStyle = 'rgba(42, 33, 53, 0.5)'
  ctx.lineWidth = 1.4
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath()
    ctx.moveTo(58, 34 + bob)
    ctx.lineTo(70, 28 + index * 5 + bob)
    ctx.stroke()
  }
}

function paintCat(scene: Phaser.Scene) {
  for (let frame = 0; frame < 4; frame += 1) {
    paint(scene, `cat-down-${frame}`, CAT_SIZE, CAT_SIZE, (ctx) => paintCatDown(ctx, frame))
    paint(scene, `cat-up-${frame}`, CAT_SIZE, CAT_SIZE, (ctx) => paintCatUp(ctx, frame))
    paint(scene, `cat-right-${frame}`, CAT_SIZE, CAT_SIZE, (ctx) => paintCatSide(ctx, frame))
    paint(scene, `cat-left-${frame}`, CAT_SIZE, CAT_SIZE, (ctx) => {
      ctx.translate(CAT_SIZE, 0)
      ctx.scale(-1, 1)
      paintCatSide(ctx, frame)
    })
  }
}

// ---------------------------------------------------------------------------
// Vegetation and props
// ---------------------------------------------------------------------------

/** Forest floor: the same lawn recipe, taken down into shade and leaf litter. */
function paintForestFloor(scene: Phaser.Scene) {
  const size = 256
  paint(scene, 'forest-floor', size, size, (ctx) => {
    ctx.fillStyle = PALETTE.forestFloor
    ctx.fillRect(0, 0, size, size)

    const random = noise(31)

    /**
     * The floor is tiled across the whole world, so anything bigger than a few
     * pixels has to be drawn nine times - once per neighbouring tile - or it
     * gets cut at the edge and the tiling grid becomes visible as seams.
     */
    const wrapped = (draw: (offsetX: number, offsetY: number) => void) => {
      for (const offsetX of [-size, 0, size]) {
        for (const offsetY of [-size, 0, size]) draw(offsetX, offsetY)
      }
    }

    const blob = (
      color: string,
      count: number,
      radiusX: () => number,
      radiusY: () => number,
    ) => {
      ctx.fillStyle = color
      for (let index = 0; index < count; index += 1) {
        const x = random() * size
        const y = random() * size
        const rx = radiusX()
        const ry = radiusY()
        const tilt = random() * Math.PI
        wrapped((offsetX, offsetY) => {
          ctx.beginPath()
          ctx.ellipse(x + offsetX, y + offsetY, rx, ry, tilt, 0, Math.PI * 2)
          ctx.fill()
        })
      }
    }

    // Broad patches of shade, so the canopy reads as uneven.
    blob(PALETTE.forestFloorDark, 22, () => 22 + random() * 46, () => 16 + random() * 34)
    blob(PALETTE.forestFloorLight, 14, () => 14 + random() * 26, () => 10 + random() * 18)

    // Undergrowth.
    ctx.strokeStyle = PALETTE.forestFloorMid
    ctx.lineWidth = 2
    for (let index = 0; index < 260; index += 1) {
      const x = random() * size
      const y = random() * size
      const height = 3 + random() * 6
      wrapped((offsetX, offsetY) => {
        ctx.beginPath()
        ctx.moveTo(x + offsetX, y + offsetY)
        ctx.quadraticCurveTo(
          x + offsetX + 2,
          y + offsetY - height * 0.6,
          x + offsetX + 1,
          y + offsetY - height,
        )
        ctx.stroke()
      })
    }

    // Fallen leaves.
    blob('rgba(196, 148, 74, 0.5)', 40, () => 3.2, () => 1.8)
    blob('rgba(122, 83, 52, 0.45)', 30, () => 3.2, () => 1.8)
  })
}

function paintTrees(scene: Phaser.Scene) {
  const size = 132
  const variants = [
    {
      radius: 42,
      canopy: PALETTE.treeCanopy,
      light: PALETTE.treeCanopyLight,
      seed: 11,
      bumps: 9,
    },
    {
      radius: 38,
      canopy: PALETTE.treeCanopyDark,
      light: PALETTE.treeCanopy,
      seed: 23,
      bumps: 8,
    },
    {
      radius: 45,
      canopy: PALETTE.treeCanopyLight,
      light: '#7ed06d',
      seed: 41,
      bumps: 10,
    },
  ]

  variants.forEach((variant, index) => {
    paint(scene, `tree-${index}`, size, size, (ctx) => {
      const cx = size / 2
      groundShadow(ctx, cx + 4, 116, variant.radius * 0.85, 11)

      ctx.strokeStyle = INK
      ctx.lineWidth = 11
      ctx.beginPath()
      ctx.moveTo(cx, 116)
      ctx.lineTo(cx - 2, 88)
      ctx.stroke()
      ctx.strokeStyle = PALETTE.treeTrunk
      ctx.lineWidth = 6.5
      ctx.stroke()

      blob(ctx, cx, 66, variant.radius, variant.bumps, variant.seed)
      inked(ctx, variant.canopy, 4)

      // Light from the top-left: a smaller blob offset into the highlight side.
      ctx.save()
      blob(ctx, cx, 66, variant.radius, variant.bumps, variant.seed)
      ctx.clip()
      blob(ctx, cx - 11, 55, variant.radius * 0.76, variant.bumps, variant.seed + 5)
      ctx.fillStyle = variant.light
      ctx.fill()
      ctx.restore()

      ctx.save()
      blob(ctx, cx, 66, variant.radius, variant.bumps, variant.seed)
      ctx.clip()
      ctx.fillStyle = 'rgba(20, 60, 30, 0.22)'
      ctx.beginPath()
      ctx.ellipse(cx + 16, 84, variant.radius * 0.8, variant.radius * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  })
}

function paintBush(scene: Phaser.Scene) {
  paint(scene, 'bush', 84, 64, (ctx) => {
    groundShadow(ctx, 42, 52, 26, 7)
    blob(ctx, 42, 36, 24, 8, 17)
    inked(ctx, PALETTE.bushDark, 3.4)
    ctx.save()
    blob(ctx, 42, 36, 24, 8, 17)
    ctx.clip()
    blob(ctx, 36, 29, 18, 7, 29)
    ctx.fillStyle = PALETTE.bushLight
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#ff6f91'
    for (const point of [
      [30, 30],
      [48, 26],
      [52, 40],
      [36, 44],
    ]) {
      ctx.beginPath()
      ctx.arc(point[0], point[1], 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function paintLamp(scene: Phaser.Scene) {
  paint(scene, 'lamp', 48, 128, (ctx) => {
    groundShadow(ctx, 24, 120, 13, 5)
    ctx.strokeStyle = INK
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(24, 120)
    ctx.lineTo(24, 38)
    ctx.stroke()
    ctx.strokeStyle = '#4f5a6b'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(13, 36)
    ctx.lineTo(35, 36)
    ctx.lineTo(30, 20)
    ctx.lineTo(18, 20)
    ctx.closePath()
    inked(ctx, '#41506a', 3)

    ellipse(ctx, 24, 36, 9, 4)
    ctx.fillStyle = '#ffe9a8'
    ctx.fill()
  })
}

function paintBench(scene: Phaser.Scene) {
  paint(scene, 'bench', 92, 56, (ctx) => {
    groundShadow(ctx, 46, 46, 34, 7)
    roundedRect(ctx, 10, 22, 72, 12, 5)
    inked(ctx, PALETTE.standWood, 3)
    roundedRect(ctx, 10, 10, 72, 10, 4)
    inked(ctx, PALETTE.standWoodDark, 3)
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    for (const x of [20, 72]) {
      ctx.beginPath()
      ctx.moveTo(x, 34)
      ctx.lineTo(x, 44)
      ctx.stroke()
    }
  })
}

/**
 * Wraps text to at most `maxLines`, shrinking the font until it fits. Department
 * names range from "IT" to "Sport și Sănătate", so the banner has to
 * size itself rather than assume a length.
 */
function fitText(ctx: Ctx, text: string, maxWidth: number, maxLines: number, maxSize: number) {
  for (let size = maxSize; size >= 9; size -= 1) {
    ctx.font = `800 ${size}px ${FONT}`
    const lines = wrapText(ctx, text, maxWidth, maxLines)
    if (lines) {
      return { lines, size }
    }
  }

  ctx.font = `800 9px ${FONT}`
  return { lines: [text], size: 9 }
}

function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] | null {
  const lines: string[] = []
  let current = ''

  for (const word of text.split(' ')) {
    if (ctx.measureText(word).width > maxWidth) {
      return null
    }
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
    if (lines.length >= maxLines) {
      return null
    }
  }

  if (current) {
    lines.push(current)
  }
  return lines.length <= maxLines ? lines : null
}

export const STAND_TEXTURE_WIDTH = 240
export const STAND_TEXTURE_HEIGHT = 190
/** Fraction of the texture height where the stand meets the ground. */
export const STAND_ORIGIN_Y = 176 / STAND_TEXTURE_HEIGHT

/** The OSUT booth: the single most important prop, so it gets the most detail. */
function paintStands(scene: Phaser.Scene, stands: { id: string; label: string; color: number }[]) {
  const width = STAND_TEXTURE_WIDTH
  const height = STAND_TEXTURE_HEIGHT

  for (const stand of stands) {
    const accent = STAND_COLORS[stand.color % STAND_COLORS.length]

    paint(scene, `stand-${stand.id}`, width, height, (ctx) => {
      const cx = width / 2
      groundShadow(ctx, cx, 176, 74, 15)

      // Posts
      ctx.strokeStyle = INK
      ctx.lineWidth = 11
      for (const x of [cx - 76, cx + 76]) {
        ctx.beginPath()
        ctx.moveTo(x, 172)
        ctx.lineTo(x, 74)
        ctx.stroke()
      }
      ctx.strokeStyle = PALETTE.standWoodDark
      ctx.lineWidth = 6
      for (const x of [cx - 76, cx + 76]) {
        ctx.beginPath()
        ctx.moveTo(x, 172)
        ctx.lineTo(x, 74)
        ctx.stroke()
      }

      // Striped canopy, drawn as a shallow arc so it reads as fabric under tension.
      const canopy = (context: Ctx) => {
        context.beginPath()
        context.moveTo(cx - 98, 74)
        context.quadraticCurveTo(cx, 30, cx + 98, 74)
        context.lineTo(cx + 98, 88)
        context.quadraticCurveTo(cx, 44, cx - 98, 88)
        context.closePath()
      }

      ctx.save()
      canopy(ctx)
      ctx.clip()
      ctx.fillStyle = '#f7f1e4'
      ctx.fillRect(cx - 104, 20, 208, 76)
      ctx.fillStyle = accent
      for (let x = -104; x < 104; x += 34) {
        ctx.fillRect(cx + x, 20, 17, 76)
      }
      ctx.restore()

      canopy(ctx)
      ctx.strokeStyle = INK
      ctx.lineWidth = 3.6
      ctx.stroke()

      // Scalloped valance
      ctx.fillStyle = accent
      ctx.strokeStyle = INK
      ctx.lineWidth = 2.4
      for (let scallop = 0; scallop < 7; scallop += 1) {
        const x = cx - 94 + scallop * 27
        ctx.beginPath()
        ctx.arc(x + 13, 86, 13, 0, Math.PI)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      // Banner — carries the department name, which is how the player
      // identifies a stand from across the alley.
      roundedRect(ctx, cx - 96, 100, 192, 46, 9)
      inked(ctx, '#fffaf0', 3.4)
      ctx.fillStyle = accent
      ctx.fillRect(cx - 92, 103, 184, 4)

      const { lines, size } = fitText(ctx, stand.label, 176, 2, 19)
      ctx.fillStyle = INK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const lineHeight = size + 3
      const startY = 125 - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, index) => {
        ctx.fillText(line, cx, startY + index * lineHeight)
      })

      // Table
      roundedRect(ctx, cx - 86, 148, 172, 14, 5)
      inked(ctx, PALETTE.standWood, 3.2)
      roundedRect(ctx, cx - 90, 160, 180, 18, 4)
      inked(ctx, '#f2ece0', 3.2)
      ctx.fillStyle = accent
      ctx.fillRect(cx - 86, 166, 172, 5)

      ctx.fillStyle = 'rgba(42, 33, 53, 0.55)'
      ctx.font = `800 9px ${FONT}`
      ctx.fillText('OSUT', cx, 174)
    })
  }
}

/** Floating markers above a stand: unsolved, solved, and cooling down. */
function paintMarkers(scene: Phaser.Scene) {
  const bubble = (ctx: Ctx, fill: string) => {
    roundedRect(ctx, 6, 6, 52, 44, 14)
    inked(ctx, fill, 3.6)
    ctx.beginPath()
    ctx.moveTo(26, 48)
    ctx.lineTo(32, 62)
    ctx.lineTo(40, 48)
    ctx.closePath()
    inked(ctx, fill, 3.6)
  }

  // Only the solved marker exists. A stand that still has a question carries no
  // badge at all - the prompt that appears when you walk up to it is what says
  // there is something to do, and an empty campus reads as more to find.
  paint(scene, 'marker-done', 64, 70, (ctx) => {
    bubble(ctx, '#8ee0a4')
    ctx.strokeStyle = INK
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(22, 28)
    ctx.lineTo(29, 36)
    ctx.lineTo(43, 20)
    ctx.stroke()
  })
}

function paintMedal(scene: Phaser.Scene) {
  paint(scene, 'medal', 72, 84, (ctx) => {
    ctx.beginPath()
    ctx.moveTo(24, 6)
    ctx.lineTo(36, 40)
    ctx.lineTo(24, 40)
    ctx.closePath()
    inked(ctx, PALETTE.medalRibbon, 3)
    ctx.beginPath()
    ctx.moveTo(48, 6)
    ctx.lineTo(36, 40)
    ctx.lineTo(48, 40)
    ctx.closePath()
    inked(ctx, '#2c56a8', 3)

    ctx.beginPath()
    ctx.arc(36, 56, 22, 0, Math.PI * 2)
    inked(ctx, PALETTE.medal, 3.6)
    ctx.beginPath()
    ctx.arc(36, 56, 14, 0, Math.PI * 2)
    inked(ctx, PALETTE.medalDark, 2.6)

    ctx.fillStyle = '#fff3c4'
    ctx.beginPath()
    ctx.arc(30, 50, 5, 0, Math.PI * 2)
    ctx.fill()

    // Star
    ctx.beginPath()
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI / 5) * index - Math.PI / 2
      const radius = index % 2 === 0 ? 9 : 4
      const x = 36 + Math.cos(angle) * radius
      const y = 56 + Math.sin(angle) * radius
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = '#fff6d6'
    ctx.fill()
  })
}

function paintSparkle(scene: Phaser.Scene) {
  paint(scene, 'sparkle', 32, 32, (ctx) => {
    ctx.fillStyle = '#fff3b0'
    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.quadraticCurveTo(18, 14, 32, 16)
    ctx.quadraticCurveTo(18, 18, 16, 32)
    ctx.quadraticCurveTo(14, 18, 0, 16)
    ctx.quadraticCurveTo(14, 14, 16, 0)
    ctx.closePath()
    ctx.fill()
  })
}

function paintDust(scene: Phaser.Scene) {
  paint(scene, 'dust', 16, 16, (ctx) => {
    ctx.fillStyle = 'rgba(232, 222, 196, 0.9)'
    ctx.beginPath()
    ctx.arc(8, 8, 6, 0, Math.PI * 2)
    ctx.fill()
  })
}

export function gateTextureKey(gate: { id: string }) {
  return `gate-${gate.id}`
}

/**
 * One texture per gate, because each carries its own sign text. The text is
 * shrunk to fit the board rather than overflowing it, the same way a stand's
 * banner handles a long department name.
 */
function paintGate(scene: Phaser.Scene, gate: Gate) {
  paint(scene, gateTextureKey(gate), 176, 120, (ctx) => {
    groundShadow(ctx, 88, 108, 64, 9)
    for (const x of [26, 150]) {
      roundedRect(ctx, x - 13, 30, 26, 74, 6)
      inked(ctx, '#b9a98c', 3.4)
      roundedRect(ctx, x - 17, 20, 34, 14, 5)
      inked(ctx, '#8d7f66', 3.4)
    }
    roundedRect(ctx, 20, 10, 136, 24, 8)
    inked(ctx, '#2f6fd0', 3.6)

    const sign = gate.sign ?? DEFAULT_GATE_SIGN
    if (!sign) return

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = 14
    do {
      ctx.font = `800 ${size}px ${FONT}`
      if (ctx.measureText(sign).width <= 126) break
      size -= 1
    } while (size > 7)
    ctx.fillText(sign, 88, 23)
  })
}

function paintSportProps(scene: Phaser.Scene) {
  paint(scene, 'goal', 120, 80, (ctx) => {
    groundShadow(ctx, 60, 70, 44, 7)
    ctx.strokeStyle = INK
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(16, 68)
    ctx.lineTo(16, 20)
    ctx.lineTo(104, 20)
    ctx.lineTo(104, 68)
    ctx.stroke()
    ctx.strokeStyle = '#f2efe4'
    ctx.lineWidth = 4.5
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.4
    for (let x = 22; x < 104; x += 9) {
      ctx.beginPath()
      ctx.moveTo(x, 22)
      ctx.lineTo(x, 66)
      ctx.stroke()
    }
    for (let y = 24; y < 68; y += 9) {
      ctx.beginPath()
      ctx.moveTo(18, y)
      ctx.lineTo(102, y)
      ctx.stroke()
    }
  })

  paint(scene, 'bars', 140, 110, (ctx) => {
    groundShadow(ctx, 70, 98, 52, 8)
    ctx.strokeStyle = INK
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(24, 96)
    ctx.lineTo(24, 30)
    ctx.moveTo(116, 96)
    ctx.lineTo(116, 30)
    ctx.moveTo(18, 30)
    ctx.lineTo(122, 30)
    ctx.moveTo(40, 96)
    ctx.lineTo(40, 58)
    ctx.moveTo(100, 96)
    ctx.lineTo(100, 58)
    ctx.moveTo(36, 58)
    ctx.lineTo(104, 58)
    ctx.stroke()
    ctx.strokeStyle = '#e0542f'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(24, 96)
    ctx.lineTo(24, 30)
    ctx.moveTo(116, 96)
    ctx.lineTo(116, 30)
    ctx.moveTo(40, 96)
    ctx.lineTo(40, 58)
    ctx.moveTo(100, 96)
    ctx.lineTo(100, 58)
    ctx.stroke()
    ctx.strokeStyle = '#dfe4ea'
    ctx.beginPath()
    ctx.moveTo(18, 30)
    ctx.lineTo(122, 30)
    ctx.moveTo(36, 58)
    ctx.lineTo(104, 58)
    ctx.stroke()
  })
}

/** Open-air cinema: a big screen on a frame, plus folding chairs in rows. */
function paintCinemaProps(scene: Phaser.Scene) {
  paint(scene, 'cinema-screen', 260, 150, (ctx) => {
    groundShadow(ctx, 130, 138, 96, 10)

    ctx.strokeStyle = INK
    ctx.lineWidth = 10
    for (const x of [34, 226]) {
      ctx.beginPath()
      ctx.moveTo(x, 134)
      ctx.lineTo(x, 100)
      ctx.stroke()
    }
    ctx.strokeStyle = '#4a5161'
    ctx.lineWidth = 6
    for (const x of [34, 226]) {
      ctx.beginPath()
      ctx.moveTo(x, 134)
      ctx.lineTo(x, 100)
      ctx.stroke()
    }

    roundedRect(ctx, 16, 12, 228, 96, 8)
    inked(ctx, '#20283a', 4)
    roundedRect(ctx, 26, 22, 208, 76, 5)
    inked(ctx, '#dfe9f2', 3)

    // A frame of light on the screen so it reads as switched on.
    ctx.fillStyle = 'rgba(143, 211, 240, 0.55)'
    ctx.fillRect(34, 30, 192, 28)
    ctx.fillStyle = 'rgba(255, 224, 150, 0.4)'
    ctx.fillRect(34, 62, 192, 28)
  })

  paint(scene, 'cinema-chair', 40, 46, (ctx) => {
    groundShadow(ctx, 20, 40, 13, 4)
    roundedRect(ctx, 7, 18, 26, 14, 4)
    inked(ctx, '#c2503f', 2.6)
    roundedRect(ctx, 7, 6, 26, 12, 4)
    inked(ctx, '#a83f31', 2.6)
  })
}

function paintCar(scene: Phaser.Scene) {
  const colors = ['#e05a4a', '#4a8fd0', '#f0c245', '#57b573']
  colors.forEach((color, index) => {
    paint(scene, `car-${index}`, 64, 112, (ctx) => {
      groundShadow(ctx, 32, 100, 24, 8)
      roundedRect(ctx, 10, 12, 44, 84, 14)
      inked(ctx, color, 3.4)
      roundedRect(ctx, 16, 22, 32, 20, 7)
      inked(ctx, '#8fd3f0', 2.6)
      roundedRect(ctx, 16, 64, 32, 18, 7)
      inked(ctx, '#8fd3f0', 2.6)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(16, 46, 32, 10)
    })
  })
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

const BUILDING_PAD = 30

/**
 * One texture per wing, not per block.
 *
 * A wing is painted square and the sprite carries both angles, so the texture
 * stays small and crisp whatever the rotation. It also lets each wing take its
 * own depth, which is what allows the wings of a dorm to stand apart with the
 * cat walking between them.
 */
export function partTextureKey(building: Building, index: number) {
  return `building-${building.id}-${index}`
}

export function partTextureBounds(part: BuildingPart) {
  return {
    width: part.width + BUILDING_PAD * 2,
    height: part.height + WALL_HEIGHT + BUILDING_PAD * 2,
  }
}

/** The wing's own centre, as origin fractions: what both rotations turn about. */
export function partTextureOrigin(part: BuildingPart) {
  const bounds = partTextureBounds(part)
  return {
    x: (BUILDING_PAD + part.width / 2) / bounds.width,
    y: (BUILDING_PAD + part.height / 2) / bounds.height,
  }
}

/**
 * A wing is drawn as a roof seen from above plus a short south-facing wall,
 * which is the cheapest way to get readable depth in a top-down scene.
 */
const ROOF_COLORS = {
  dorm: [PALETTE.roof, PALETTE.roofLight, PALETTE.roofDark],
  canteen: [PALETTE.cantinaRoof, PALETTE.cantinaRoofLight, PALETTE.cantinaRoofDark],
  office: [PALETTE.officeRoof, PALETTE.officeRoofLight, PALETTE.officeRoofDark],
} as const

function paintBuildingPart(scene: Phaser.Scene, building: Building, index: number) {
  const part = building.parts[index]
  const bounds = partTextureBounds(part)
  const [roof, roofLight, roofDark] = ROOF_COLORS[building.kind]

  paint(scene, partTextureKey(building, index), bounds.width, bounds.height, (ctx) => {
    const x = BUILDING_PAD
    const y = BUILDING_PAD

    ctx.save()
    ctx.fillStyle = 'rgba(30, 40, 25, 0.2)'
    roundedRect(ctx, x + 8, y + WALL_HEIGHT + 10, part.width, part.height, 10)
    ctx.fill()
    ctx.restore()

    // South-facing wall
    roundedRect(ctx, x, y + part.height - 8, part.width, WALL_HEIGHT + 8, 6)
    inked(ctx, PALETTE.wall, 3.6)
    ctx.fillStyle = PALETTE.wallShade
    ctx.fillRect(x + 4, y + part.height + WALL_HEIGHT - 8, part.width - 8, 6)

    // Windows
    const windowCount = Math.max(2, Math.floor(part.width / 46))
    const gap = part.width / windowCount
    for (let slot = 0; slot < windowCount; slot += 1) {
      const wx = x + gap * slot + gap / 2 - 11
      roundedRect(ctx, wx, y + part.height + 2, 22, 16, 4)
      inked(ctx, PALETTE.window, 2.4)
      ctx.fillStyle = PALETTE.windowDark
      ctx.fillRect(wx + 3, y + part.height + 10, 16, 6)
    }

    // Roof
    roundedRect(ctx, x, y, part.width, part.height, 8)
    inked(ctx, roof, 3.8)

    const horizontal = part.width >= part.height
    ctx.save()
    roundedRect(ctx, x, y, part.width, part.height, 8)
    ctx.clip()

    // Sunlit half of the roof
    ctx.fillStyle = roofLight
    if (horizontal) {
      ctx.fillRect(x, y, part.width, part.height / 2)
    } else {
      ctx.fillRect(x, y, part.width / 2, part.height)
    }

    ctx.fillStyle = roofDark
    if (horizontal) {
      ctx.fillRect(x, y + part.height / 2 + 6, part.width, part.height / 2)
    } else {
      ctx.fillRect(x + part.width / 2 + 6, y, part.width / 2, part.height)
    }

    // Tile rows
    ctx.strokeStyle = 'rgba(42, 33, 53, 0.16)'
    ctx.lineWidth = 1.6
    if (horizontal) {
      for (let tx = x + 14; tx < x + part.width; tx += 14) {
        ctx.beginPath()
        ctx.moveTo(tx, y)
        ctx.lineTo(tx, y + part.height)
        ctx.stroke()
      }
    } else {
      for (let ty = y + 14; ty < y + part.height; ty += 14) {
        ctx.beginPath()
        ctx.moveTo(x, ty)
        ctx.lineTo(x + part.width, ty)
        ctx.stroke()
      }
    }
    ctx.restore()

    // Ridge
    ctx.strokeStyle = PALETTE.roofRidge
    ctx.lineWidth = 5
    ctx.beginPath()
    if (horizontal) {
      ctx.moveTo(x + 6, y + part.height / 2)
      ctx.lineTo(x + part.width - 6, y + part.height / 2)
    } else {
      ctx.moveTo(x + part.width / 2, y + 6)
      ctx.lineTo(x + part.width / 2, y + part.height - 6)
    }
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.6
    ctx.stroke()

    roundedRect(ctx, x, y, part.width, part.height, 8)
    ctx.strokeStyle = INK
    ctx.lineWidth = 3.8
    ctx.stroke()

    // The entrance goes on whichever wing is furthest south.
    if (index !== frontPartIndex(building)) return

    const centre = { x: part.x + part.width / 2, y: part.y + part.height / 2 }
    const [localX] = rotate(building.door.x, building.door.y, centre.x, centre.y, -(part.rotation ?? 0))
    // Kept on the wall: a door dragged past the end of its wing would otherwise
    // paint outside the texture and simply vanish.
    const doorX = clamp(x + (localX - part.x), x + 28, x + part.width - 28)
    const doorY = y + part.height

    roundedRect(ctx, doorX - 26, doorY - 4, 52, 18, 6)
    inked(ctx, '#2f6fd0', 3)
    roundedRect(ctx, doorX - 14, doorY + 12, 28, WALL_HEIGHT - 6, 4)
    inked(ctx, '#7a5b3c', 3)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(doorX - 10, doorY + 16, 20, 8)
  })

  return bounds
}

/** The southernmost wing, which is the one the entrance belongs on. */
export function frontPartIndex(building: Building) {
  let best = 0
  building.parts.forEach((part, index) => {
    if (part.y + part.height > building.parts[best].y + building.parts[best].height) best = index
  })
  return best
}

function rotate(x: number, y: number, cx: number, cy: number, degrees: number) {
  if (!degrees) return [x, y]
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value))
}

// ---------------------------------------------------------------------------

export function createAllTextures(
  scene: Phaser.Scene,
  buildings: Building[],
  stands: { id: string; label: string; color: number }[],
  gates: Gate[],
) {
  paintGrass(scene)
  paintForestFloor(scene)
  paintCat(scene)
  paintTrees(scene)
  paintBush(scene)
  paintLamp(scene)
  paintBench(scene)
  paintStands(scene, stands)
  paintMarkers(scene)
  paintMedal(scene)
  paintSparkle(scene)
  paintDust(scene)
  for (const gate of gates) paintGate(scene, gate)
  paintSportProps(scene)
  paintCinemaProps(scene)
  paintCar(scene)

  for (const building of buildings) {
    building.parts.forEach((_, index) => paintBuildingPart(scene, building, index))
  }
}

export function createCatAnimations(scene: Phaser.Scene) {
  const directions: CatDirection[] = ['down', 'up', 'left', 'right']
  for (const direction of directions) {
    const frames = [0, 1, 2, 3].map((frame) => ({
      key: `cat-${direction}-${frame}`,
    }))
    if (!scene.anims.exists(`cat-walk-${direction}`)) {
      scene.anims.create({
        key: `cat-walk-${direction}`,
        frames,
        frameRate: 9,
        repeat: -1,
      })
    }
    if (!scene.anims.exists(`cat-idle-${direction}`)) {
      scene.anims.create({
        key: `cat-idle-${direction}`,
        frames: [{ key: `cat-${direction}-0` }, { key: `cat-${direction}-2` }],
        frameRate: 1.4,
        repeat: -1,
      })
    }
  }
}
