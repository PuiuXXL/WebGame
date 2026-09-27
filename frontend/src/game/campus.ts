/**
 * The map.
 *
 * The raw positions live in campus.layout.ts, which the map editor writes
 * (`npm run map:edit`). This file owns the types, and everything derived from
 * those positions: scattered scenery, lamps and benches following the alleys,
 * cars filling the car park.
 *
 * Layout, as the plan of the Observator campus lays it out:
 *
 *   ┌───────────── gard ──────────────┐        ╭─ Cămin 1 ─╮
 *   │        ALEEA DE NORD            │       Cămin 2      ╰── poarta est
 *   │  Pașnic · proiecții · C6 · C4   │
 *   │────────  ALEEA CENTRALĂ  ───────┴──╮     sport · cantina
 *   │  fotbal · sport · C7 · C5 · C3     │        parcare
 *   └──────────── gard ─────────────────┴── poarta sud
 */

import { LAYOUT } from './campus.layout.ts'

export type Rect = { x: number; y: number; width: number; height: number }
export type Point = [number, number]

export type Road = {
  id: string
  points: Point[]
  width: number
  surface: 'asphalt' | 'paved'
}

export type BuildingPart = Rect & {
  /**
   * Degrees clockwise, about this wing's own centre, applied before the
   * block's own rotation. The real dorms are chevrons whose two wings meet at
   * about 105 degrees, not at 90, so a block rotation alone cannot describe
   * them - each wing needs its own angle.
   */
  rotation?: number
}

export type Building = {
  id: string
  label: string
  /** Dog-leg blocks are two overlapping rectangles; simple blocks are one. */
  parts: BuildingPart[]
  kind: 'dorm' | 'canteen' | 'office'
  /** Where the entrance awning is drawn, in world coordinates. */
  door: { x: number; y: number }
  /**
   * Nudges the name away from where it is placed automatically. Names are
   * positioned from the shape they belong to, which is right until two of them
   * land on top of each other; then you want to move one by hand.
   */
  labelOffset?: Point
  /**
   * Degrees clockwise, about the centre of the block's bounding box. The real
   * dorms sit at an angle to the alleys, and drawing them square made the map
   * read as a grid that does not exist. Absent or 0 means axis-aligned.
   *
   * This turns the whole block, wings and all, on top of each wing's own
   * rotation - so you can angle a dorm without disturbing its shape.
   */
  rotation?: number
}

/**
 * Woodland filling the ground outside the fence. Purely scenery: the fence is
 * what stops the player, so a forest has no collider of its own - it just stops
 * the world from ending in flat lawn.
 */
export type Forest = {
  id: string
  label: string
  bounds: Rect
}

export type Zone = {
  id: string
  label: string
  kind: 'pitch' | 'calisthenics' | 'cinema' | 'parking'
  bounds: Rect
  /**
   * Nudges the name away from where it is placed automatically. Names are
   * positioned from the shape they belong to, which is right until two of them
   * land on top of each other; then you want to move one by hand.
   */
  labelOffset?: Point
}

/**
 * A stretch of fence. Several of them, rather than one closed ring, because the
 * campus is not one ring: the wall stops either side of the western street so
 * you can walk out to the OSUT building, which has a fence of its own.
 *
 * An open line is a plain wall with two ends. `closed` joins the last point
 * back to the first, and also marks the line as an enclosure, which is what
 * the scenery scatter uses to decide what counts as "inside the campus".
 */
export type FenceLine = {
  id: string
  label: string
  points: Point[]
  closed?: boolean
}

export type Gate = {
  id: string
  label: string
  x: number
  y: number
  /** Main gates are the three red circles on the plan; the rest are side gates. */
  main: boolean
  rotation: number
  /** How wide a hole this gate punches in the fence. */
  opening: number
  /** Text painted on the gate's own sign board. */
  sign?: string
  /**
   * Nudges the name away from where it is placed automatically. Names are
   * positioned from the shape they belong to, which is right until two of them
   * land on top of each other; then you want to move one by hand.
   */
  labelOffset?: Point
}

export type StandId =
  | 'bal-bobocilor'
  | 'polihack'
  | 'sport-sanatate'
  | 'viitor-inginer'
  | 'infotech'
  | 'divertisment'
  | 'imagine'
  | 'it'
  | 'media'
  | 'pr'
  | 'tehnic'
  | 'tineret'
  | 'financiar'

export type Stand = {
  id: StandId
  /** Printed on the stand's own banner, so it has to stay short enough to read. */
  label: string
  x: number
  y: number
  /** Index into STAND_COLORS. */
  color: number
}

/**
 * The layout file is generated, so its inferred type is structural JSON rather
 * than these unions. The cast is the trust boundary; `npm run map:check`
 * validates the contents.
 */
export const WORLD_WIDTH = LAYOUT.world.width
export const WORLD_HEIGHT = LAYOUT.world.height
export const FENCE_LINES = LAYOUT.fence as unknown as FenceLine[]
export const ROADS = LAYOUT.roads as unknown as Road[]
export const BUILDINGS = LAYOUT.buildings as unknown as Building[]
export const ZONES = LAYOUT.zones as unknown as Zone[]
export const FORESTS = (LAYOUT.forests ?? []) as unknown as Forest[]
export const GATES = LAYOUT.gates as unknown as Gate[]
export const STANDS = LAYOUT.stands as unknown as Stand[]
export const SPAWN = LAYOUT.spawn as { x: number; y: number }

export const STAND_INTERACT_RADIUS = 110
export const TOTAL_MEDALS = STANDS.length

/** Height of the short south-facing wall drawn below every roof. */
export const WALL_HEIGHT = 34

/** How thick the fence is drawn, and how wide its collider runs. */
export const FENCE_THICKNESS = 16

// ---------------------------------------------------------------------------
// Fence
//
// Sides may run at any angle, so nothing here assumes axis alignment. Gates cut
// their opening out of whichever run passes closest to them - which is only a
// convenience: a wall can equally just stop, and that is how the western street
// is left open.
// ---------------------------------------------------------------------------

export type Segment = [Point, Point]

export function fenceSegments(): Segment[] {
  const segments: Segment[] = []
  for (const line of FENCE_LINES) {
    const count = line.points.length
    const last = line.closed ? count : count - 1
    for (let index = 0; index < last; index += 1) {
      segments.push([line.points[index], line.points[(index + 1) % count]])
    }
  }
  return segments
}

/** How far a gate may sit from a wall and still be taken as standing in it. */
const GATE_REACH = 80

/** Fence segments with the gate openings removed: what is actually built. */
export function fenceRuns(): Segment[] {
  const runs: Segment[] = []

  for (const [a, b] of fenceSegments()) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 1) continue
    const ux = (b[0] - a[0]) / length
    const uy = (b[1] - a[1]) / length
    const at = (distance: number): Point => [a[0] + ux * distance, a[1] + uy * distance]

    const holes: Array<[number, number]> = []
    for (const gate of GATES) {
      if (distanceToSegment(gate.x, gate.y, a, b) > GATE_REACH) continue
      const along = (gate.x - a[0]) * ux + (gate.y - a[1]) * uy
      const from = Math.max(0, along - gate.opening / 2)
      const to = Math.min(length, along + gate.opening / 2)
      if (to > from) holes.push([from, to])
    }
    holes.sort((one, other) => one[0] - other[0])

    let cursor = 0
    for (const [from, to] of holes) {
      if (from > cursor) runs.push([at(cursor), at(from)])
      cursor = Math.max(cursor, to)
    }
    if (cursor < length) runs.push([at(cursor), b])
  }

  return runs
}

/** The four corners of a run, as a rectangle of the fence's own thickness. */
export function fenceRunPolygon([a, b]: Segment, thickness = FENCE_THICKNESS): Point[] {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const nx = (-(b[1] - a[1]) / length) * (thickness / 2)
  const ny = ((b[0] - a[0]) / length) * (thickness / 2)
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ]
}

/**
 * Colliders for the fence. A straight run is one rectangle; a run at an angle
 * is covered by the same staircase of slabs the rotated buildings use.
 */
export function fenceColliders(thickness = FENCE_THICKNESS + 8, slabWidth = 36): Rect[] {
  const boxes: Rect[] = []

  for (const run of fenceRuns()) {
    const [a, b] = run
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) continue

    const polygon = fenceRunPolygon(run, thickness)
    if (a[0] === b[0] || a[1] === b[1]) {
      const xs = polygon.map((point) => point[0])
      const ys = polygon.map((point) => point[1])
      boxes.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      })
    } else {
      boxes.push(...slabsForPolygon(polygon, slabWidth))
    }
  }

  return boxes
}

// ---------------------------------------------------------------------------
// Building geometry
//
// Buildings can be rotated, so their footprint is a polygon rather than a
// rectangle. Everything that needs to know where a building actually is - the
// scenery scatter, the colliders, the blueprint render, the layout checker -
// goes through these, so there is one definition of "rotated building" instead
// of four that can drift apart.
// ---------------------------------------------------------------------------

export function rotateAround(x: number, y: number, cx: number, cy: number, degrees: number): Point {
  if (!degrees) return [x, y]
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

export function rectCorners(rect: Rect): Point[] {
  return [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ]
}

/**
 * A wing turns about its own centre, and that centre is the roof rectangle's -
 * not the roof-plus-wall one - so the roof stays put when the skirt is added.
 */
export function partCentre(part: BuildingPart): { x: number; y: number } {
  return { x: part.x + part.width / 2, y: part.y + part.height / 2 }
}

/**
 * One wing's outline in block-local space: rotated about its own centre, but
 * before the block's own rotation is applied.
 */
export function partPolygon(part: BuildingPart, margin = 0, wall = 0): Point[] {
  const centre = partCentre(part)
  return rectCorners({
    x: part.x - margin,
    y: part.y - margin,
    width: part.width + margin * 2,
    height: part.height + wall + margin * 2,
  }).map(([x, y]) => rotateAround(x, y, centre.x, centre.y, part.rotation ?? 0))
}

/** Union bounding box of the roofs in block-local space, wall skirt excluded. */
export function buildingBox(building: Building): Rect {
  const points = building.parts.flatMap((part) => partPolygon(part))
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY }
}

/**
 * The point a building turns about: the centre of its bounding box once the
 * wings have taken their own angles. Taking it after the wings rotate is what
 * keeps a chevron turning about the middle of the chevron.
 */
export function buildingPivot(building: Building): { x: number; y: number } {
  const box = buildingBox(building)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * One polygon per part, in world space, with the wall skirt included so the
 * footprint matches what the player sees. Grown outward by `margin` first,
 * which is how the scatter keeps trees off the walls.
 *
 * Both rotations apply: the wing turns about itself, then the block turns the
 * lot about its pivot.
 */
export function buildingPolygons(building: Building, margin = 0): Point[][] {
  const pivot = buildingPivot(building)
  const rotation = building.rotation ?? 0
  return building.parts.map((part) =>
    partPolygon(part, margin, WALL_HEIGHT).map(([x, y]) =>
      rotateAround(x, y, pivot.x, pivot.y, rotation),
    ),
  )
}

/** True when the point falls inside any part, by undoing both rotations. */
export function insideBuilding(building: Building, x: number, y: number, margin = 0) {
  const pivot = buildingPivot(building)
  const [lx, ly] = rotateAround(x, y, pivot.x, pivot.y, -(building.rotation ?? 0))
  return building.parts.some((part) => {
    const centre = partCentre(part)
    const [px, py] = rotateAround(lx, ly, centre.x, centre.y, -(part.rotation ?? 0))
    return insideRect(px, py, { ...part, height: part.height + WALL_HEIGHT }, margin)
  })
}

/** Clips a convex polygon to one side of a vertical line. */
function clipToHalfPlaneX(polygon: Point[], x: number, keepRight: boolean): Point[] {
  const inside = (point: Point) => (keepRight ? point[0] >= x : point[0] <= x)
  const out: Point[] = []

  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]
    const b = polygon[(index + 1) % polygon.length]
    if (inside(a)) out.push(a)
    if (inside(a) !== inside(b)) {
      const t = (x - a[0]) / (b[0] - a[0])
      out.push([x, a[1] + t * (b[1] - a[1])])
    }
  }
  return out
}

/**
 * Axis-aligned boxes covering a building's footprint.
 *
 * Arcade physics static bodies cannot rotate, so a turned building is covered
 * by a staircase of vertical slabs instead. Each slab spans the full height of
 * the footprint inside its column, which makes the collider a slight superset
 * of the visible shape - the cat stops a few pixels short of a corner rather
 * than walking into the wall, which is the error worth having.
 */
export function slabsForPolygon(polygon: Point[], slabWidth = 36): Rect[] {
  const minX = Math.min(...polygon.map((point) => point[0]))
  const maxX = Math.max(...polygon.map((point) => point[0]))
  const columns = Math.max(1, Math.ceil((maxX - minX) / slabWidth))
  const step = (maxX - minX) / columns
  const slabs: Rect[] = []

  for (let column = 0; column < columns; column += 1) {
    const left = minX + column * step
    const strip = clipToHalfPlaneX(clipToHalfPlaneX(polygon, left, true), left + step, false)
    if (strip.length < 3) continue
    const top = Math.min(...strip.map((point) => point[1]))
    const bottom = Math.max(...strip.map((point) => point[1]))
    slabs.push({ x: left, y: top, width: step, height: bottom - top })
  }
  return slabs
}

export function buildingColliders(building: Building, slabWidth = 36): Rect[] {
  const turned = (building.rotation ?? 0) !== 0 || building.parts.some((part) => part.rotation)
  if (!turned) {
    return building.parts.map((part) => ({
      x: part.x,
      y: part.y,
      width: part.width,
      height: part.height + WALL_HEIGHT,
    }))
  }

  return buildingPolygons(building).flatMap((polygon) => slabsForPolygon(polygon, slabWidth))
}

/** Separating-axis test for two convex polygons. Touching edges do not count. */
export function polygonsOverlap(a: Point[], b: Point[]) {
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index]
      const next = polygon[(index + 1) % polygon.length]
      const axisX = -(next[1] - current[1])
      const axisY = next[0] - current[0]

      let minA = Infinity
      let maxA = -Infinity
      for (const [x, y] of a) {
        const projection = x * axisX + y * axisY
        minA = Math.min(minA, projection)
        maxA = Math.max(maxA, projection)
      }
      let minB = Infinity
      let maxB = -Infinity
      for (const [x, y] of b) {
        const projection = x * axisX + y * axisY
        minB = Math.min(minB, projection)
        maxB = Math.max(maxB, projection)
      }
      if (maxA <= minB || maxB <= minA) return false
    }
  }
  return true
}

/**
 * Points spread over a building's footprint, for tests that sample rather than
 * intersect (is any of this building sitting on a road?).
 */
export function buildingSamplePoints(building: Building, step = 20): Point[] {
  const pivot = buildingPivot(building)
  const rotation = building.rotation ?? 0
  const points: Point[] = []

  for (const part of building.parts) {
    const centre = partCentre(part)
    const spin = part.rotation ?? 0
    const bottom = part.y + part.height + WALL_HEIGHT
    for (let x = part.x; x <= part.x + part.width; x += step) {
      for (let y = part.y; y <= bottom; y += step) {
        const [lx, ly] = rotateAround(x, y, centre.x, centre.y, spin)
        points.push(rotateAround(lx, ly, pivot.x, pivot.y, rotation))
      }
    }
  }
  return points
}

// ---------------------------------------------------------------------------
// Where names go
//
// One definition, used by the game, the blueprint render and the map editor.
// They used to each place names their own way, so a name lined up in the editor
// landed somewhere else in the game - which made the nudge useless.
// ---------------------------------------------------------------------------

export const LABEL_SIZE = {
  dorm: 24,
  office: 21,
  canteen: 21,
  zone: 20,
  gateMain: 20,
  gateSide: 17,
} as const

export const DEFAULT_GATE_SIGN = 'UTCN · OBSERVATOR'

/** Above the block, centred on its pivot, plus whatever nudge was set. */
export function buildingLabelAnchor(building: Building): Point {
  const pivot = buildingPivot(building)
  const top = Math.min(...buildingPolygons(building).flat().map(([, y]) => y))
  const [dx, dy] = building.labelOffset ?? [0, 0]
  return [pivot.x + dx, top - 14 + dy]
}

export function zoneLabelAnchor(zone: Zone): Point {
  const [dx, dy] = zone.labelOffset ?? [0, 0]
  return [zone.bounds.x + zone.bounds.width / 2 + dx, zone.bounds.y - 16 + dy]
}

export function gateLabelAnchor(gate: Gate): Point {
  const [dx, dy] = gate.labelOffset ?? [0, 0]
  return [gate.x + dx, gate.y - (gate.rotation === 0 ? 118 : 86) + dy]
}

export function buildingLabelSize(building: Building) {
  return LABEL_SIZE[building.kind]
}

export function gateLabelSize(gate: Gate) {
  return gate.main ? LABEL_SIZE.gateMain : LABEL_SIZE.gateSide
}

// ---------------------------------------------------------------------------
// Scenery, derived from the layout
// ---------------------------------------------------------------------------

export type ScatterItem = { x: number; y: number; variant: number; scale: number }

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function insideRect(x: number, y: number, rect: Rect, margin: number) {
  return (
    x > rect.x - margin &&
    x < rect.x + rect.width + margin &&
    y > rect.y - margin &&
    y < rect.y + rect.height + margin
  )
}

function distanceToSegment(x: number, y: number, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(x - a[0], y - a[1])
  }
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared))
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
}

function onRoad(x: number, y: number, margin: number) {
  for (const road of ROADS) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      if (
        distanceToSegment(x, y, road.points[index], road.points[index + 1]) <
        road.width / 2 + margin
      ) {
        return true
      }
    }
  }
  return false
}

function nearFence(x: number, y: number, margin: number) {
  return fenceSegments().some(([a, b]) => distanceToSegment(x, y, a, b) < margin)
}

function insidePolygon(x: number, y: number, polygon: Point[]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index]
    const [xj, yj] = polygon[previous]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * True when the point is outside every enclosure.
 *
 * Only fence lines marked `closed` enclose anything; a plain wall has two ends
 * and fences nothing in. If the map has no closed line at all, nothing is
 * "outside" and the scatter falls back to the other rules.
 */
function outsideFence(x: number, y: number) {
  const rings = FENCE_LINES.filter((line) => line.closed)
  if (rings.length === 0) return false
  return !rings.some((ring) => insidePolygon(x, y, ring.points))
}

function blocked(x: number, y: number, margin: number) {
  if (outsideFence(x, y)) return true
  if (nearFence(x, y, margin + 30)) return true
  if (onRoad(x, y, margin)) return true

  for (const building of BUILDINGS) {
    if (insideBuilding(building, x, y, margin + 60)) return true
  }
  for (const zone of ZONES) {
    if (insideRect(x, y, zone.bounds, margin)) return true
  }
  // Forests grow their own trees, so the loose scatter keeps out of them.
  for (const forest of FORESTS) {
    if (insideRect(x, y, forest.bounds, margin)) return true
  }
  for (const stand of STANDS) {
    if (Math.hypot(x - stand.x, y - stand.y) < 230) return true
  }
  for (const gate of GATES) {
    if (Math.hypot(x - gate.x, y - gate.y) < 240) return true
  }
  return false
}

/**
 * Hand-placing three dozen trees is a recipe for one of them ending up inside a
 * wall. Scattering them with rejection sampling against the same data the world
 * is built from means the map stays clean when the layout is retuned.
 */
function scatter(count: number, seed: number, margin: number, variants: number): ScatterItem[] {
  const random = mulberry32(seed)
  const items: ScatterItem[] = []
  let attempts = 0

  while (items.length < count && attempts < count * 400) {
    attempts += 1
    const x = 80 + random() * (WORLD_WIDTH - 160)
    const y = 80 + random() * (WORLD_HEIGHT - 160)

    if (blocked(x, y, margin)) continue
    if (items.some((item) => Math.hypot(item.x - x, item.y - y) < margin * 1.6)) continue

    items.push({
      x: Math.round(x),
      y: Math.round(y),
      variant: Math.floor(random() * variants),
      scale: 0.85 + random() * 0.35,
    })
  }

  return items
}

export const TREES = scatter(80, 20240917, 86, 3)

/**
 * The woods: dense enough to read as forest rather than as a lawn with trees
 * on it, thinned near the edge so the rectangle does not announce itself.
 */
export const FOREST_TREES: ScatterItem[] = FORESTS.flatMap((forest, index) => {
  const { x, y, width, height } = forest.bounds
  const random = mulberry32(90210 + index * 7919)
  // Spacing is a performance knob as much as a look: every tree is a sprite
  // the depth sort walks each frame, and the floor texture already reads as wood.
  const spacing = 132
  const items: ScatterItem[] = []

  for (let row = 0; row * spacing < height; row += 1) {
    for (let column = 0; column * spacing < width; column += 1) {
      // Jittered grid: keeps the cover even without the rows showing.
      const px = x + column * spacing + spacing * (0.15 + random() * 0.7)
      const py = y + row * spacing + spacing * (0.15 + random() * 0.7)
      if (px > x + width || py > y + height) continue

      const toEdge = Math.min(px - x, x + width - px, py - y, y + height - py)
      if (toEdge < 70 && random() > toEdge / 70) continue

      items.push({
        x: Math.round(px),
        y: Math.round(py),
        variant: Math.floor(random() * 3),
        scale: 0.9 + random() * 0.5,
      })
    }
  }
  return items
})
export const BUSHES = scatter(46, 77123, 58, 1)

/** Lamps and benches follow the alleys instead of being scattered. */
function alongRoad(roadId: string, spacing: number, offset: number): Point[] {
  const road = ROADS.find((entry) => entry.id === roadId)
  if (!road) return []

  const points: Point[] = []
  for (let index = 0; index < road.points.length - 1; index += 1) {
    const [ax, ay] = road.points[index]
    const [bx, by] = road.points[index + 1]
    const length = Math.hypot(bx - ax, by - ay)
    if (length === 0) continue
    const nx = -(by - ay) / length
    const ny = (bx - ax) / length

    for (let travelled = spacing / 2; travelled < length; travelled += spacing) {
      const t = travelled / length
      points.push([
        Math.round(ax + (bx - ax) * t + nx * offset),
        Math.round(ay + (by - ay) * t + ny * offset),
      ])
    }
  }
  return points
}

/** Keeps furniture clear of the stands, which own the alley verges. */
function awayFromStands(points: Point[], radius: number): Point[] {
  return points.filter(
    ([x, y]) => !STANDS.some((stand) => Math.hypot(x - stand.x, y - stand.y) < radius),
  )
}

export const LAMPS: Point[] = awayFromStands(
  [
    ...alongRoad('aleea-centrala', 520, -152),
    ...alongRoad('aleea-centrala', 520, 152),
    ...alongRoad('aleea-nord', 620, -92),
    ...alongRoad('spina-est', 480, -108),
  ],
  220,
)

export const BENCHES: Point[] = awayFromStands(
  [...alongRoad('aleea-centrala', 900, -146), ...alongRoad('spina-est', 820, 110)],
  240,
)

/** Cars fill whichever rectangle the layout marks as the car park. */
export const PARKED_CARS: { x: number; y: number; variant: number; angle: number }[] = (() => {
  const lot = ZONES.find((zone) => zone.kind === 'parking')
  if (!lot) return []

  const { x, y, width, height } = lot.bounds
  const columns = Math.max(1, Math.floor((width - 80) / 74))
  const rows = height > 150 ? 2 : 1
  const cars: { x: number; y: number; variant: number; angle: number }[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cars.push({
        x: Math.round(x + 55 + column * 74),
        y: Math.round(y + (rows === 1 ? height * 0.85 : 58 + row * (height - 76))),
        variant: (column + row * 2) % 4,
        angle: row === 0 ? 0 : 180,
      })
    }
  }
  return cars
})()
