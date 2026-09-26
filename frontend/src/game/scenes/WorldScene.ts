import Phaser from 'phaser'
import {
  BENCHES,
  FENCE_THICKNESS,
  FORESTS,
  FOREST_TREES,
  BUILDINGS,
  BUSHES,
  GATES,
  LAMPS,
  PARKED_CARS,
  ROADS,
  SPAWN,
  STANDS,
  STAND_INTERACT_RADIUS,
  TOTAL_MEDALS,
  TREES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZONES,
  LABEL_SIZE,
  buildingColliders,
  buildingLabelAnchor,
  buildingLabelSize,
  buildingPivot,
  buildingPolygons,
  gateLabelAnchor,
  gateLabelSize,
  zoneLabelAnchor,
  fenceColliders,
  fenceRuns,
  partCentre,
  rotateAround,
  type Road,
  type Segment,
  type Stand,
  type StandId,
  type Zone,
} from '../campus'
import { INK, PALETTE, toNumber } from '../palette'
import {
  STAND_ORIGIN_Y,
  gateTextureKey,
  partTextureKey,
  partTextureOrigin,
  type CatDirection,
} from '../textures'
import type { GameBridge, GameState } from '../bridge'

/** Base walking speed; the settings slider scales it. */
const SPEED = 290

/**
 * Where the solved badge sits above a stand: tucked down against the canopy
 * normally, lifted clear when the cat is close enough to interact. It marks
 * what you have done without turning every finished stand into a beacon.
 */
const MARKER_REST = 118
const MARKER_LIFTED = 206
/** Per-frame easing toward the target height. */
const MARKER_GLIDE = 0.18
const CAMERA_ZOOM = 0.9
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

export class WorldScene extends Phaser.Scene {
  private bridge!: GameBridge
  private state!: GameState

  private cat!: Phaser.Physics.Arcade.Sprite
  private solids!: Phaser.Physics.Arcade.StaticGroup
  private facing: CatDirection = 'right'
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter

  private standSprites = new Map<StandId, Phaser.GameObjects.Image>()
  private standMarkers = new Map<StandId, Phaser.GameObjects.Image>()
  private nearest: Stand | null = null

  private prompt!: Phaser.GameObjects.Container
  private promptText!: Phaser.GameObjects.Text
  private hudText!: Phaser.GameObjects.Text

  constructor() {
    super('world')
  }

  // Read from the registry rather than scene data, so scene.restart() - which
  // carries no data - rebuilds the world against the same bridge and state.
  init() {
    this.bridge = this.registry.get('bridge') as GameBridge
    this.state = this.registry.get('state') as GameState
    this.standSprites.clear()
    this.standMarkers.clear()
    this.nearest = null
    this.facing = 'right'
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setZoom(CAMERA_ZOOM)
    this.cameras.main.setBackgroundColor(toNumber(PALETTE.grassDark))

    this.solids = this.physics.add.staticGroup()

    this.paintGround()
    this.paintForests()
    this.buildZones()
    this.buildFence()
    this.buildBuildings()
    this.buildScenery()
    this.buildStands()
    this.buildCat()
    this.buildPrompt()
    this.buildHud()

    this.physics.add.collider(this.cat, this.solids)
    this.cameras.main.startFollow(this.cat, true, 0.12, 0.12)
    this.cameras.main.fadeIn(420, 0, 0, 0)

    this.bridge.setResetHandler(() => {
      this.state.reset(STANDS.map((stand) => stand.id))
      this.scene.stop('trivia')
      this.scene.resume()
      this.scene.restart()
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bridge.setResetHandler(null)
    })

    this.publishStatus()
  }

  // -------------------------------------------------------------------------
  // Ground and roads
  // -------------------------------------------------------------------------

  /**
   * Roads are stroked polylines with a filled circle at every vertex. The
   * circles are what give clean round corners where the eastern spine bends -
   * Phaser's line joins would otherwise leave notches on the outside of a turn.
   */
  private strokeRoad(
    graphics: Phaser.GameObjects.Graphics,
    road: Road,
    width: number,
    color: number,
  ) {
    graphics.lineStyle(width, color, 1)
    graphics.beginPath()
    graphics.moveTo(road.points[0][0], road.points[0][1])
    for (let index = 1; index < road.points.length; index += 1) {
      graphics.lineTo(road.points[index][0], road.points[index][1])
    }
    graphics.strokePath()

    graphics.fillStyle(color, 1)
    for (const [x, y] of road.points) {
      graphics.fillCircle(x, y, width / 2)
    }
  }

  /** Walks a polyline, calling back at a fixed spacing. Used for road markings. */
  private walkRoad(
    road: Road,
    spacing: number,
    callback: (x: number, y: number, angle: number) => void,
  ) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const [ax, ay] = road.points[index]
      const [bx, by] = road.points[index + 1]
      const length = Math.hypot(bx - ax, by - ay)
      const angle = Math.atan2(by - ay, bx - ax)
      for (let travelled = spacing / 2; travelled < length; travelled += spacing) {
        const t = travelled / length
        callback(ax + (bx - ax) * t, ay + (by - ay) * t, angle)
      }
    }
  }

  private paintGround() {
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'grass')
      .setOrigin(0, 0)
      .setDepth(-1000)

    const ground = this.add.graphics().setDepth(-900)

    // Every road gets a darker skirt first, so adjacent surfaces stay separated.
    for (const road of ROADS) {
      const edge = road.surface === 'asphalt' ? '#3f4854' : PALETTE.pathEdge
      this.strokeRoad(ground, road, road.width + 18, toNumber(edge))
    }

    for (const road of ROADS) {
      const surface = road.surface === 'asphalt' ? PALETTE.asphalt : PALETTE.path
      this.strokeRoad(ground, road, road.width, toNumber(surface))
    }

    const markings = this.add.graphics().setDepth(-890)

    for (const road of ROADS) {
      if (road.surface === 'asphalt') {
        markings.fillStyle(toNumber(PALETTE.roadLine), 0.8)
        this.walkRoad(road, 190, (x, y, angle) => {
          markings.save()
          markings.translateCanvas(x, y)
          markings.rotateCanvas(angle)
          markings.fillRect(-40, -4, 80, 8)
          markings.restore()
        })
      } else {
        // Paving joints, so an alley does not read as a flat beige band.
        markings.lineStyle(2, toNumber(PALETTE.pathEdge), 0.6)
        this.walkRoad(road, 62, (x, y, angle) => {
          const nx = Math.cos(angle + Math.PI / 2)
          const ny = Math.sin(angle + Math.PI / 2)
          const half = road.width / 2 - 4
          markings.lineBetween(x - nx * half, y - ny * half, x + nx * half, y + ny * half)
        })
      }
    }
  }

  /**
   * Woodland outside the fence, so the world does not end in flat lawn.
   *
   * The floor is masked into the rectangle rather than drawn as one, with a
   * scalloped edge: a hard rectangle of dark green would read as a mistake. The
   * trees themselves are depth-sorted like any other prop, which is what makes
   * the tree line look like it has depth from inside the campus.
   */
  private paintForests() {
    if (FORESTS.length === 0) return

    const edge = this.add.graphics()
    for (const forest of FORESTS) {
      const { x, y, width, height } = forest.bounds
      edge.fillStyle(0xffffff, 1)
      edge.fillRect(x + 40, y + 40, width - 80, height - 80)

      // Scallops around the border, so no straight edge survives.
      const step = 70
      const bump = (px: number, py: number, radius: number) => edge.fillCircle(px, py, radius)
      for (let travelled = 0; travelled <= width; travelled += step) {
        const wobble = 26 + ((travelled * 37) % 23)
        bump(x + travelled, y + 44, wobble)
        bump(x + travelled, y + height - 44, wobble)
      }
      for (let travelled = 0; travelled <= height; travelled += step) {
        const wobble = 26 + ((travelled * 53) % 23)
        bump(x + 44, y + travelled, wobble)
        bump(x + width - 44, y + travelled, wobble)
      }
    }

    const floor = this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'forest-floor')
      .setOrigin(0, 0)
      .setDepth(-980)
    floor.setMask(edge.createGeometryMask())
    edge.setVisible(false)

    for (const tree of FOREST_TREES) {
      this.addProp(`tree-${tree.variant}`, tree.x, tree.y, 0.5, 0.92).setScale(tree.scale)
    }
  }

  // -------------------------------------------------------------------------
  // Open-air zones
  // -------------------------------------------------------------------------

  private buildZones() {
    const graphics = this.add.graphics().setDepth(-880)

    for (const zone of ZONES) {
      switch (zone.kind) {
        case 'pitch':
          this.paintPitch(graphics, zone)
          break
        case 'calisthenics':
          this.paintCalisthenics(graphics, zone)
          break
        case 'cinema':
          this.paintCinema(graphics, zone)
          break
        case 'parking':
          this.paintParking(graphics, zone)
          break
      }

      const [labelX, labelY] = zoneLabelAnchor(zone)
      this.addLabel(zone.label, labelX, labelY, LABEL_SIZE.zone)
    }

    for (const car of PARKED_CARS) {
      this.addProp(`car-${car.variant}`, car.x, car.y, 0.5, 0.9).setAngle(car.angle)
    }
  }

  private paintPitch(graphics: Phaser.GameObjects.Graphics, zone: Zone) {
    const { x, y, width, height } = zone.bounds
    graphics.fillStyle(toNumber(PALETTE.pitch), 1)
    graphics.fillRoundedRect(x, y, width, height, 10)
    graphics.fillStyle(toNumber(PALETTE.pitchStripe), 1)
    for (let stripe = 0; stripe < height; stripe += 48) {
      graphics.fillRect(x, y + stripe, width, 24)
    }
    graphics.lineStyle(4, toNumber(PALETTE.pitchLine), 0.9)
    graphics.strokeRoundedRect(x + 14, y + 14, width - 28, height - 28, 6)
    graphics.lineBetween(x + 14, y + height / 2, x + width - 14, y + height / 2)
    graphics.strokeCircle(x + width / 2, y + height / 2, 48)
    graphics.lineStyle(5, toNumber(INK), 0.5)
    graphics.strokeRoundedRect(x, y, width, height, 10)

    this.addProp('goal', x + width / 2, y + 30, 0.5, 1)
    this.addProp('goal', x + width / 2, y + height, 0.5, 1).setFlipY(true)
  }

  private paintCalisthenics(graphics: Phaser.GameObjects.Graphics, zone: Zone) {
    const { x, y, width, height } = zone.bounds
    graphics.fillStyle(toNumber(PALETTE.court), 1)
    graphics.fillRoundedRect(x, y, width, height, 12)
    graphics.fillStyle(toNumber('#d47e58'), 1)
    for (let stripe = 0; stripe < width; stripe += 44) {
      graphics.fillRect(x + stripe, y, 22, height)
    }
    graphics.lineStyle(5, toNumber(INK), 0.5)
    graphics.strokeRoundedRect(x, y, width, height, 12)

    this.addProp('bars', x + width * 0.32, y + height * 0.8, 0.5, 1)
    this.addProp('bars', x + width * 0.74, y + height * 0.5, 0.5, 1).setScale(0.78)
  }

  private paintCinema(graphics: Phaser.GameObjects.Graphics, zone: Zone) {
    const { x, y, width, height } = zone.bounds
    graphics.fillStyle(toNumber('#57893f'), 1)
    graphics.fillRoundedRect(x, y, width, height, 16)
    graphics.lineStyle(5, toNumber(INK), 0.45)
    graphics.strokeRoundedRect(x, y, width, height, 16)

    this.addProp('cinema-screen', x + width / 2, y + 96, 0.5, 1)

    // Seating rows, staggered so it reads as an audience layout.
    for (let row = 0; row < 3; row += 1) {
      const rowY = y + 150 + row * 42
      const offset = row % 2 === 0 ? 0 : 22
      for (let seat = 0; seat < 5; seat += 1) {
        this.addProp('cinema-chair', x + 46 + offset + seat * 44, rowY, 0.5, 1)
      }
    }
  }

  private paintParking(graphics: Phaser.GameObjects.Graphics, zone: Zone) {
    const { x, y, width, height } = zone.bounds
    graphics.fillStyle(toNumber('#4d5561'), 1)
    graphics.fillRoundedRect(x, y, width, height, 8)
    graphics.lineStyle(4, toNumber(PALETTE.roadLine), 0.75)
    for (let slot = 0; slot <= width; slot += 66) {
      graphics.lineBetween(x + slot, y + 6, x + slot, y + height - 6)
    }
    graphics.lineBetween(x + 6, y + height / 2, x + width - 6, y + height / 2)
    graphics.lineStyle(5, toNumber(INK), 0.45)
    graphics.strokeRoundedRect(x, y, width, height, 8)
  }

  // -------------------------------------------------------------------------
  // Buildings and scenery
  // -------------------------------------------------------------------------

  private buildBuildings() {
    for (const building of BUILDINGS) {
      // One sprite per wing. Each is painted square and carries both angles -
      // its own plus the block's - and its own depth, so wings that stand apart
      // sort against the cat separately instead of moving as one slab.
      const pivot = buildingPivot(building)
      const blockRotation = building.rotation ?? 0
      const polygons = buildingPolygons(building)
      const footprint = polygons.flat()
      const bottom = Math.max(...footprint.map(([, y]) => y))

      building.parts.forEach((part, index) => {
        const centre = partCentre(part)
        const [x, y] = rotateAround(centre.x, centre.y, pivot.x, pivot.y, blockRotation)
        const origin = partTextureOrigin(part)

        this.add
          .image(x, y, partTextureKey(building, index))
          .setOrigin(origin.x, origin.y)
          .setAngle(blockRotation + (part.rotation ?? 0))
          .setDepth(Math.max(...polygons[index].map(([, py]) => py)))
      })

      for (const slab of buildingColliders(building)) {
        this.addSolid(slab.x, slab.y, slab.width, slab.height)
      }

      const [labelX, labelY] = buildingLabelAnchor(building)
      this.addLabel(building.label, labelX, labelY, buildingLabelSize(building)).setDepth(bottom + 1)
    }
  }

  private buildScenery() {
    for (const tree of TREES) {
      this.addProp(`tree-${tree.variant}`, tree.x, tree.y, 0.5, 0.92).setScale(tree.scale)
      // Only the trunk blocks: walking under a canopy edge should feel free.
      this.addSolid(tree.x - 13, tree.y - 14, 26, 18)
    }

    for (const bush of BUSHES) {
      this.addProp('bush', bush.x, bush.y, 0.5, 0.9).setScale(bush.scale)
    }

    for (const [x, y] of LAMPS) {
      this.addProp('lamp', x, y, 0.5, 0.94)
    }

    for (const [x, y] of BENCHES) {
      this.addProp('bench', x, y, 0.5, 0.9)
      this.addSolid(x - 40, y - 14, 80, 16)
    }

    for (const gate of GATES) {
      const sprite = this.addProp(gateTextureKey(gate), gate.x, gate.y, 0.5, 0.9)
      sprite.setAngle(gate.rotation)
      if (!gate.main) {
        sprite.setScale(0.72)
      }
      const [labelX, labelY] = gateLabelAnchor(gate)
      this.addLabel(gate.label, labelX, labelY, gateLabelSize(gate))
    }
  }

  private buildStands() {
    for (const stand of STANDS) {
      // The department name is printed on the stand's own banner, so there is no
      // separate floating label to collide with a neighbour's.
      const sprite = this.addProp(`stand-${stand.id}`, stand.x, stand.y, 0.5, STAND_ORIGIN_Y)
      this.standSprites.set(stand.id, sprite)
      this.addSolid(stand.x - 70, stand.y - 26, 140, 26)

      // Hidden until the stand is solved; refreshMarkers pops it in and rides
      // it up and down as the cat comes and goes.
      const marker = this.add
        .image(stand.x, stand.y - MARKER_REST, 'marker-done')
        .setOrigin(0.5, 1)
        .setDepth(stand.y + 2)
        .setVisible(false)
      this.standMarkers.set(stand.id, marker)
    }

    this.refreshMarkers()
  }

  /**
   * The campus is walled in rather than ringed by a road.
   *
   * The wall is a set of lines, not one ring: it stops either side of the
   * western street so you can walk out to the OSUT building. Runs may sit at
   * any angle, so each one is drawn in its own rotated frame and collided with
   * the same slab staircase the angled buildings use.
   */
  private buildFence() {
    const graphics = this.add.graphics().setDepth(-500)

    for (const run of fenceRuns()) {
      this.paintFenceRun(graphics, run)
    }
    for (const slab of fenceColliders()) {
      this.addSolid(slab.x, slab.y, slab.width, slab.height)
    }
  }

  private paintFenceRun(graphics: Phaser.GameObjects.Graphics, [a, b]: Segment) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 1) return

    const thickness = FENCE_THICKNESS
    const half = thickness / 2

    graphics.save()
    graphics.translateCanvas(a[0], a[1])
    graphics.rotateCanvas(Math.atan2(b[1] - a[1], b[0] - a[0]))

    graphics.fillStyle(0x000000, 0.18)
    graphics.fillRect(4, -half + 8, length, thickness)
    graphics.fillStyle(toNumber(INK), 1)
    graphics.fillRect(-2, -half - 2, length + 4, thickness + 4)
    graphics.fillStyle(toNumber('#8d8271'), 1)
    graphics.fillRect(0, -half, length, thickness)
    graphics.fillStyle(toNumber('#a89b86'), 1)
    graphics.fillRect(0, -half, length, half)
    graphics.restore()

    // Posts, thicker than the rail so the fence does not read as a plain stripe.
    for (let travelled = 0; travelled <= length; travelled += 150) {
      const t = travelled / length
      const px = a[0] + (b[0] - a[0]) * t
      const py = a[1] + (b[1] - a[1]) * t
      graphics.fillStyle(toNumber(INK), 1)
      graphics.fillRect(px - 9, py - 15, 18, 30)
      graphics.fillStyle(toNumber('#6f6555'), 1)
      graphics.fillRect(px - 6, py - 12, 12, 24)
    }
  }

  private buildCat() {
    this.cat = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'cat-right-0')
    this.cat.setOrigin(0.5, 0.78)
    this.cat.setCollideWorldBounds(true)

    // Collide on a small box at the paws only. A body the size of the sprite
    // would make the cat bump into things its head merely overlaps.
    const body = this.cat.body as Phaser.Physics.Arcade.Body
    body.setSize(28, 16)
    body.setOffset(22, 44)

    this.cat.play('cat-idle-right')

    this.dust = this.add.particles(0, 0, 'dust', {
      speed: { min: 12, max: 34 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.65, end: 0 },
      lifespan: 420,
      frequency: 95,
      emitting: false,
    })
    this.dust.startFollow(this.cat, 0, 16)
  }

  private buildPrompt() {
    const background = this.add.graphics()
    background.fillStyle(toNumber(INK), 0.92)
    background.fillRoundedRect(-118, -26, 236, 48, 14)
    background.lineStyle(3, 0xffd84d, 1)
    background.strokeRoundedRect(-118, -26, 236, 48, 14)

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.prompt = this.add.container(0, 0, [background, this.promptText])
    this.prompt.setDepth(9000).setVisible(false)

    this.tweens.add({
      targets: this.prompt,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private buildHud() {
    const panel = this.add.graphics()
    panel.fillStyle(toNumber(INK), 0.85)
    panel.fillRoundedRect(0, 0, 264, 62, 16)
    panel.lineStyle(3, 0xffcb3d, 1)
    panel.strokeRoundedRect(0, 0, 264, 62, 16)

    const icon = this.add.image(38, 31, 'medal').setScale(0.62)

    this.hudText = this.add
      .text(74, 31, '', {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)

    this.add
      .container(20, 18, [panel, icon, this.hudText])
      .setScrollFactor(0, 0, true)
      .setDepth(10000)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private addProp(key: string, x: number, y: number, originX: number, originY: number) {
    return this.add.image(x, y, key).setOrigin(originX, originY).setDepth(y)
  }

  private addSolid(x: number, y: number, width: number, height: number) {
    const rectangle = this.add.rectangle(x + width / 2, y + height / 2, width, height)
    rectangle.setVisible(false)
    this.physics.add.existing(rectangle, true)
    this.solids.add(rectangle)
    return rectangle
  }

  private addLabel(text: string, x: number, y: number, size: number) {
    return this.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: '800',
        color: '#fffaf0',
        stroke: INK,
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(y + 1)
  }

  private refreshMarkers() {
    for (const stand of STANDS) {
      const marker = this.standMarkers.get(stand.id)
      if (!marker) continue

      const solved = this.state.get(stand.id).solved

      // Called every frame, so the pop has to fire only on the transition.
      if (solved !== marker.visible) {
        marker.setVisible(solved)
        marker.y = stand.y - MARKER_REST

        if (solved) {
          // Full size first, then the pop plays over it. The badge must never
          // depend on a tween finishing - a tween killed by a scene restart
          // would otherwise leave it scaled to nothing and invisible for good.
          marker.setScale(1)
          this.tweens.add({
            targets: marker,
            scaleX: { from: 0, to: 1 },
            scaleY: { from: 0, to: 1 },
            duration: 420,
            ease: 'Back.easeOut',
            onComplete: () => marker.setScale(1),
          })
        }
      }

      if (!solved) continue

      // Eased by hand rather than tweened: the target flips every time the cat
      // crosses the interact radius, and a tween per crossing would stack up.
      const target = stand.y - (this.nearest?.id === stand.id ? MARKER_LIFTED : MARKER_REST)
      marker.y = Phaser.Math.Linear(marker.y, target, MARKER_GLIDE)
    }
  }

  private publishStatus() {
    const medals = this.state.medals
    this.hudText.setText(`${medals} / ${TOTAL_MEDALS} medalii`)
    this.bridge.publish({
      medals,
      total: TOTAL_MEDALS,
      screen: 'world',
      nearStand: this.nearest?.label ?? null,
      completed: medals === TOTAL_MEDALS,
    })
  }

  /** Called by the trivia scene when it closes. */
  onTriviaClosed(standId: StandId, solved: boolean) {
    this.refreshMarkers()
    this.publishStatus()

    if (!solved) {
      return
    }

    const stand = STANDS.find((entry) => entry.id === standId)
    if (!stand) return

    const sprite = this.standSprites.get(standId)
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 180,
        yoyo: true,
        ease: 'Back.easeOut',
      })
    }

    const medal = this.add
      .image(stand.x, stand.y - 90, 'medal')
      .setDepth(9500)
      .setScale(0.2)
    this.tweens.add({
      targets: medal,
      y: stand.y - 200,
      scale: 1,
      duration: 900,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: medal,
          alpha: 0,
          duration: 350,
          onComplete: () => medal.destroy(),
        })
      },
    })

    this.add
      .particles(stand.x, stand.y - 110, 'sparkle', {
        speed: { min: 60, max: 180 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        quantity: 18,
        emitting: false,
      })
      .setDepth(9600)
      .explode(18)
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  update() {
    const input = this.bridge.input
    const edges = this.bridge.consumeEdges()

    let vx = 0
    let vy = 0
    if (input.left) vx -= 1
    if (input.right) vx += 1
    if (input.up) vy -= 1
    if (input.down) vy += 1

    const moving = vx !== 0 || vy !== 0
    if (moving) {
      const length = Math.hypot(vx, vy)
      const speed = SPEED * this.bridge.speedScale
      this.cat.setVelocity((vx / length) * speed, (vy / length) * speed)

      // Vertical wins ties so walking up/down while strafing still faces the way
      // the player is actually heading.
      if (Math.abs(vy) >= Math.abs(vx)) {
        this.facing = vy < 0 ? 'up' : 'down'
      } else {
        this.facing = vx < 0 ? 'left' : 'right'
      }
      this.cat.play(`cat-walk-${this.facing}`, true)
      this.dust.emitting = true
    } else {
      this.cat.setVelocity(0, 0)
      this.cat.play(`cat-idle-${this.facing}`, true)
      this.dust.emitting = false
    }

    this.cat.setDepth(this.cat.y)
    this.dust.setDepth(this.cat.y - 1)

    this.updateNearestStand()
    this.refreshMarkers()

    if (edges.has('action') && this.nearest) {
      this.openTrivia(this.nearest.id)
    }
  }

  private updateNearestStand() {
    let closest: Stand | null = null
    let closestDistance = STAND_INTERACT_RADIUS

    for (const stand of STANDS) {
      const distance = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, stand.x, stand.y - 20)
      if (distance < closestDistance) {
        closest = stand
        closestDistance = distance
      }
    }

    if (closest !== this.nearest) {
      this.nearest = closest
      this.publishStatus()
    }

    if (!closest) {
      this.prompt.setVisible(false)
      return
    }

    const progress = this.state.get(closest.id)
    const remaining = Math.ceil((progress.cooldownUntil - Date.now()) / 1000)

    let label = 'ACȚIUNE · deschide'
    if (progress.solved) {
      label = 'ACȚIUNE · rezolvat ✓'
    } else if (remaining > 0) {
      label = `ACȚIUNE · ${remaining}s`
    }

    this.promptText.setText(label)
    this.prompt.setPosition(closest.x, closest.y - 176).setVisible(true)
  }

  private openTrivia(standId: StandId) {
    this.cat.setVelocity(0, 0)
    this.dust.emitting = false
    this.prompt.setVisible(false)
    this.bridge.publish({ screen: 'trivia' })
    this.scene.pause()
    this.scene.launch('trivia', { standId })
  }
}
