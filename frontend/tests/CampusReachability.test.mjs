import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BENCHES, BUILDINGS, STANDS, TREES, SPAWN, WORLD_WIDTH, WORLD_HEIGHT,
  STAND_INTERACT_RADIUS, buildingColliders, fenceColliders,
} from '../src/game/campus.ts'

test('all 13 trivia stands can be reached from spawn around solid obstacles', () => {
  // A conservative footprint covers the cat's body in every animation.
  const margin = 28
  const step = 20
  const cols = Math.ceil(WORLD_WIDTH / step)
  const rows = Math.ceil(WORLD_HEIGHT / step)
  const blocked = new Uint8Array(cols * rows)
  const obstacles = [
    ...BUILDINGS.flatMap(building => buildingColliders(building)),
    ...fenceColliders(),
    ...TREES.map(({ x, y }) => ({ x: x - 13, y: y - 14, width: 26, height: 18 })),
    ...BENCHES.map(([x, y]) => ({ x: x - 40, y: y - 14, width: 80, height: 16 })),
    ...STANDS.map(({ x, y }) => ({ x: x - 70, y: y - 26, width: 140, height: 26 })),
  ]
  for (const rect of obstacles) {
    const minX = Math.max(0, Math.ceil((rect.x - margin) / step))
    const maxX = Math.min(cols - 1, Math.floor((rect.x + rect.width + margin) / step))
    const minY = Math.max(0, Math.ceil((rect.y - margin) / step))
    const maxY = Math.min(rows - 1, Math.floor((rect.y + rect.height + margin) / step))
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) blocked[y * cols + x] = 1
    }
  }
  const start = Math.round(SPAWN.y / step) * cols + Math.round(SPAWN.x / step)
  assert.equal(blocked[start], 0, 'spawn must be clear')
  const visited = new Uint8Array(cols * rows)
  const queue = [start]
  visited[start] = 1
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    const x = index % cols
    const y = Math.floor(index / cols)
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const next = ny * cols + nx
      if (blocked[next] || visited[next]) continue
      visited[next] = 1
      queue.push(next)
    }
  }
  for (const stand of STANDS) {
    assert.ok(queue.some(index => Math.hypot(
      index % cols * step - stand.x,
      Math.floor(index / cols) * step - (stand.y - 20),
    ) < STAND_INTERACT_RADIUS - margin), `${stand.label} is unreachable`)
  }
})
