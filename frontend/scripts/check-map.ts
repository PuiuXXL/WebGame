/**
 * Static checks on the campus layout.
 *
 * The blueprint render (npm run map) shows what the map looks like; this says
 * whether it is legal. The two catch different things - the render caught an
 * alley dead-ending in open grass, this caught stands parked in the middle of
 * that same alley, which no amount of looking would have made obvious.
 *
 *   npm run map:check
 *
 * Exits non-zero when something is wrong, so it can gate a commit.
 */

import {
  BUILDINGS,
  FENCE_LINES,
  GATES,
  ROADS,
  FORESTS,
  STANDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZONES,
  buildingPolygons,
  buildingSamplePoints,
  polygonsOverlap,
  rectCorners,
  type Point,
  type Rect,
} from '../src/game/campus.ts'

/**
 * Visual footprint of a stand, anchored at the base where it meets the ground.
 * Mirrors STAND_TEXTURE_WIDTH/HEIGHT in textures.ts, duplicated rather than
 * imported so this script pulls in no Phaser-facing module.
 */
const STAND_W = 240
const STAND_VISUAL_H = 146
/** Half-height of the stand's collision box, i.e. how far it juts into a road. */
const STAND_COLLIDER_REACH = 13
/** A road needs at least this much unobstructed width left for the player. */
const MIN_CORRIDOR = 90

const problems: string[] = []
const notes: string[] = []

function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** Bounding box of a polygon, for the checks that only need containment. */
function polygonBox(polygon: Point[]): Rect {
  const xs = polygon.map((point) => point[0])
  const ys = polygon.map((point) => point[1])
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

function distToSegment(x: number, y: number, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(x - a[0], y - a[1])
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared))
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
}

function distToRoad(x: number, y: number, road: (typeof ROADS)[number]) {
  let best = Infinity
  for (let index = 0; index < road.points.length - 1; index += 1) {
    best = Math.min(best, distToSegment(x, y, road.points[index], road.points[index + 1]))
  }
  return best
}

const standRect = (stand: (typeof STANDS)[number]): Rect => ({
  x: stand.x - STAND_W / 2,
  y: stand.y - STAND_VISUAL_H,
  width: STAND_W,
  height: STAND_VISUAL_H,
})

/**
 * One entry per wing, as a polygon: buildings can be rotated, so a rectangle
 * would either miss real overlaps or invent ones at the corners.
 */
const buildingShapes = BUILDINGS.flatMap((building) =>
  buildingPolygons(building).map((polygon) => ({ label: building.label, polygon })),
)

// --- 1. nothing visually collides -------------------------------------------
for (let i = 0; i < STANDS.length; i += 1) {
  for (let j = i + 1; j < STANDS.length; j += 1) {
    if (rectsOverlap(standRect(STANDS[i]), standRect(STANDS[j]))) {
      problems.push(`STAND↔STAND  ${STANDS[i].label} ⟷ ${STANDS[j].label}`)
    }
  }
  for (const building of buildingShapes) {
    if (polygonsOverlap(rectCorners(standRect(STANDS[i])), building.polygon)) {
      problems.push(`STAND↔CLĂDIRE  ${STANDS[i].label} ⟷ ${building.label}`)
    }
  }
  for (const zone of ZONES) {
    if (rectsOverlap(standRect(STANDS[i]), zone.bounds)) {
      problems.push(`STAND↔ZONĂ  ${STANDS[i].label} ⟷ ${zone.label}`)
    }
  }
}

for (let i = 0; i < buildingShapes.length; i += 1) {
  for (let j = i + 1; j < buildingShapes.length; j += 1) {
    if (
      buildingShapes[i].label !== buildingShapes[j].label &&
      polygonsOverlap(buildingShapes[i].polygon, buildingShapes[j].polygon)
    ) {
      problems.push(`CLĂDIRE↔CLĂDIRE  ${buildingShapes[i].label} ⟷ ${buildingShapes[j].label}`)
    }
  }
  for (const zone of ZONES) {
    if (polygonsOverlap(buildingShapes[i].polygon, rectCorners(zone.bounds))) {
      problems.push(`CLĂDIRE↔ZONĂ  ${buildingShapes[i].label} ⟷ ${zone.label}`)
    }
  }
}

// --- 2. roads stay walkable --------------------------------------------------
// Stands are *meant* to line a road; the failure is a stand standing on the
// centreline, or two rows of them squeezing the corridor shut.
for (const road of ROADS) {
  const nearby = STANDS.map((stand) => ({
    stand,
    signed: distToRoad(stand.x, stand.y - STAND_COLLIDER_REACH, road),
  })).filter((entry) => entry.signed < road.width / 2 + STAND_COLLIDER_REACH)

  for (const { stand, signed } of nearby) {
    if (signed < STAND_COLLIDER_REACH * 2) {
      problems.push(`STAND PE AXUL DRUMULUI  ${stand.label} pe ${road.id}`)
    }
  }

  if (nearby.length > 1) {
    const reach = Math.max(...nearby.map((entry) => entry.signed + STAND_COLLIDER_REACH))
    const corridor = road.width - 2 * Math.max(0, road.width / 2 - reach)
    if (corridor < MIN_CORRIDOR) {
      problems.push(`DRUM ÎNFUNDAT  ${road.id} (culoar liber ~${Math.round(corridor)}px)`)
    }
  }
}

function pointsHitRoad(points: Point[], road: (typeof ROADS)[number]) {
  return points.some(([x, y]) => distToRoad(x, y, road) < road.width / 2)
}

function rectHitsRoad(rect: Rect, road: (typeof ROADS)[number]) {
  const points: Point[] = []
  for (let x = rect.x; x <= rect.x + rect.width; x += 20) {
    for (let y = rect.y; y <= rect.y + rect.height; y += 20) points.push([x, y])
  }
  return pointsHitRoad(points, road)
}

/** Spurs are supposed to end at a door or inside the zone they serve. */
const SPUR_PREFIX = 'acces-'
for (const road of ROADS) {
  for (const building of BUILDINGS) {
    if (pointsHitRoad(buildingSamplePoints(building), road)) {
      const message = `${building.label} ⟷ ${road.id}`
      if (road.id.startsWith(SPUR_PREFIX)) notes.push(`alee de acces atinge ${message}`)
      else problems.push(`CLĂDIRE PE DRUM  ${message}`)
    }
  }
  for (const zone of ZONES) {
    if (rectHitsRoad(zone.bounds, road)) {
      const message = `${zone.label} ⟷ ${road.id}`
      if (road.id.startsWith(SPUR_PREFIX)) notes.push(`alee de acces atinge ${message}`)
      else problems.push(`ZONĂ PE DRUM  ${message}`)
    }
  }
}

// --- 3. everything is inside the fence, every gate is on it ------------------
const fencePoints = FENCE_LINES.flatMap((line) => line.points)
const fenceBox: Rect = {
  x: Math.min(...fencePoints.map((p) => p[0])),
  y: Math.min(...fencePoints.map((p) => p[1])),
  width: Math.max(...fencePoints.map((p) => p[0])) - Math.min(...fencePoints.map((p) => p[0])),
  height: Math.max(...fencePoints.map((p) => p[1])) - Math.min(...fencePoints.map((p) => p[1])),
}
const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

for (const building of buildingShapes) {
  if (!contains(fenceBox, polygonBox(building.polygon))) {
    problems.push(`ÎN AFARA GARDULUI  ${building.label}`)
  }
}
for (const stand of STANDS) {
  if (!contains(fenceBox, standRect(stand))) {
    problems.push(`ÎN AFARA GARDULUI  stand ${stand.label}`)
  }
}
for (const zone of ZONES) {
  if (!contains(fenceBox, zone.bounds)) problems.push(`ÎN AFARA GARDULUI  ${zone.label}`)
}

// A gate may stand in a wall, or mark a gap where two walls stop. What it may
// not do is float in open ground far from any fence at all.
for (const gate of GATES) {
  let nearest = Infinity
  for (const line of FENCE_LINES) {
    const last = line.closed ? line.points.length : line.points.length - 1
    for (let index = 0; index < last; index += 1) {
      const a = line.points[index]
      const b = line.points[(index + 1) % line.points.length]
      nearest = Math.min(nearest, distToSegment(gate.x, gate.y, a, b))
    }
  }
  if (nearest > 220) {
    problems.push(`POARTĂ ÎN AER  ${gate.label} (la ${Math.round(nearest)}px de orice gard)`)
  } else if (nearest > 5) {
    notes.push(`poarta „${gate.label}” stă într-o deschizătură, nu în gard`)
  }
}

for (const line of FENCE_LINES) {
  if (line.points.length < 2) problems.push(`GARD INCOMPLET  ${line.label} (sub 2 vârfuri)`)
}

// --- 4. forests stay out of the way -----------------------------------------
// A forest is only scenery, so overlapping something is not fatal - but it
// would draw dark woodland over a building or an alley, which is never meant.
for (const forest of FORESTS) {
  for (const building of buildingShapes) {
    if (polygonsOverlap(rectCorners(forest.bounds), building.polygon)) {
      problems.push(`PĂDURE PESTE CLĂDIRE  ${forest.label} ⟷ ${building.label}`)
    }
  }
  for (const zone of ZONES) {
    if (rectsOverlap(forest.bounds, zone.bounds)) {
      problems.push(`PĂDURE PESTE ZONĂ  ${forest.label} ⟷ ${zone.label}`)
    }
  }
  for (const stand of STANDS) {
    if (rectsOverlap(forest.bounds, standRect(stand))) {
      problems.push(`PĂDURE PESTE STAND  ${forest.label} ⟷ ${stand.label}`)
    }
  }
  for (const road of ROADS) {
    if (rectHitsRoad(forest.bounds, road)) {
      notes.push(`pădurea „${forest.label}” atinge ${road.id}`)
    }
  }
}

// --- 5. ids are unique and every road is a real polyline ---------------------
// Roads are hand-made in the editor now, so a copied id or a one-point road is
// a mistake that can actually happen. A duplicate id is quiet but nasty:
// alongRoad() in campus.ts resolves by find(), so lamps would follow the wrong one.
for (const [kind, list] of [
  ['drum', ROADS],
  ['stand', STANDS],
  ['cladire', BUILDINGS],
  ['zona', ZONES],
  ['poarta', GATES],
  ['padure', FORESTS],
] as const) {
  const seen = new Set<string>()
  for (const item of list) {
    if (seen.has(item.id)) problems.push(`ID DUBLAT  ${kind} "${item.id}"`)
    seen.add(item.id)
  }
}

for (const road of ROADS) {
  if (road.points.length < 2) problems.push(`DRUM INCOMPLET  ${road.id} (sub 2 varfuri)`)
}

// --- 6. every stand is actually reachable from some road ---------------------
for (const stand of STANDS) {
  const nearest = Math.min(...ROADS.map((road) => distToRoad(stand.x, stand.y, road) - road.width / 2))
  if (nearest > 120) {
    problems.push(`STAND IZOLAT  ${stand.label} (la ${Math.round(nearest)}px de orice drum)`)
  }
}

console.log(`lume ${WORLD_WIDTH}×${WORLD_HEIGHT} · gard ${fenceBox.width}×${fenceBox.height}`)
console.log(
  `${BUILDINGS.length} clădiri · ${ZONES.length} zone · ${STANDS.length} standuri · ` +
    `${ROADS.length} drumuri · ${GATES.length} porți · ${FORESTS.length} păduri`,
)

const unique = [...new Set(notes)]
if (unique.length > 0) {
  console.log(`\n${unique.length} intenționate:`)
  for (const note of unique) console.log('  · ' + note)
}

const uniqueProblems = [...new Set(problems)]
if (uniqueProblems.length === 0) {
  console.log('\nOK — harta e curată.')
} else {
  console.log(`\n${uniqueProblems.length} PROBLEME:`)
  for (const problem of uniqueProblems) console.log('  ✗ ' + problem)
  process.exitCode = 1
}
