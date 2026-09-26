/**
 * Renders campus.ts to a labelled blueprint PNG.
 *
 * The point of this tool is to close a feedback loop: the map is a wall of
 * coordinates, and coordinates cannot be eyeballed. This draws what those
 * numbers actually describe - fence, roads, buildings, zones, stands, gates -
 * on a metre grid, so a layout mistake is visible before it reaches the game.
 *
 *   npm run map
 *
 * It shells out to whatever Chrome or Edge is already installed; nothing to
 * install. Output goes to scripts/out/campus.png.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  BUILDINGS,
  BUSHES,
  FENCE_LINES,
  GATES,
  LAMPS,
  ROADS,
  SPAWN,
  STANDS,
  TREES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  FORESTS,
  ZONES,
  buildingLabelAnchor,
  gateLabelAnchor,
  zoneLabelAnchor,
} from '../src/game/campus.ts'
import { STAND_COLORS } from '../src/game/palette.ts'

const SCALE = 0.3
const MARGIN = 60
const WIDTH = Math.round(WORLD_WIDTH * SCALE) + MARGIN * 2
const HEIGHT = Math.round(WORLD_HEIGHT * SCALE) + MARGIN * 2

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error('no Chrome or Edge found; install one or edit CHROME_CANDIDATES')
}

const LABELS = {
  buildings: BUILDINGS.map((b) => buildingLabelAnchor(b)),
  zones: ZONES.map((z) => zoneLabelAnchor(z)),
  gates: GATES.map((g) => gateLabelAnchor(g)),
}

const data = {
  LABELS,
  FORESTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCALE,
  MARGIN,
  FENCE_LINES,
  ROADS,
  BUILDINGS,
  ZONES,
  STANDS,
  GATES,
  TREES,
  BUSHES,
  LAMPS,
  SPAWN,
  STAND_COLORS,
}

const page = `<!doctype html>
<meta charset="utf-8">
<body style="margin:0;background:#0d0f14">
<canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
<script>
const D = ${JSON.stringify(data)};
const ctx = document.getElementById('c').getContext('2d');
const S = D.SCALE, M = D.MARGIN;
const tx = v => v * S + M;
const ty = v => v * S + M;

ctx.fillStyle = '#12161d';
ctx.fillRect(0, 0, ${WIDTH}, ${HEIGHT});

// --- grid every 500 world units -------------------------------------------
ctx.font = '10px monospace';
ctx.strokeStyle = 'rgba(255,255,255,0.07)';
ctx.fillStyle = 'rgba(255,255,255,0.35)';
ctx.lineWidth = 1;
for (let x = 0; x <= D.WORLD_WIDTH; x += 500) {
  ctx.beginPath(); ctx.moveTo(tx(x), M); ctx.lineTo(tx(x), ty(D.WORLD_HEIGHT)); ctx.stroke();
  ctx.fillText(String(x), tx(x) + 2, M - 6);
}
for (let y = 0; y <= D.WORLD_HEIGHT; y += 500) {
  ctx.beginPath(); ctx.moveTo(M, ty(y)); ctx.lineTo(tx(D.WORLD_WIDTH), ty(y)); ctx.stroke();
  ctx.fillText(String(y), 6, ty(y) - 3);
}

// --- grass inside the fence ------------------------------------------------
ctx.fillStyle = '#20301f';
const rings = D.FENCE_LINES.filter(f => f.closed);
if (rings.length) {
  for (const f of rings) {
    ctx.beginPath();
    f.points.forEach((p, i) => i ? ctx.lineTo(tx(p[0]), ty(p[1])) : ctx.moveTo(tx(p[0]), ty(p[1])));
    ctx.closePath(); ctx.fill();
  }
} else {
  const pts = D.FENCE_LINES.flatMap(f => f.points);
  const x0 = Math.min(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1]));
  const x1 = Math.max(...pts.map(p => p[0])), y1 = Math.max(...pts.map(p => p[1]));
  ctx.fillRect(tx(x0), ty(y0), (x1-x0) * S, (y1-y0) * S);
}

// --- forests, under everything else ----------------------------------------
for (const f of D.FORESTS) {
  const b = f.bounds;
  ctx.fillStyle = '#1e4423';
  ctx.fillRect(tx(b.x), ty(b.y), b.width * S, b.height * S);
  ctx.strokeStyle = 'rgba(120,200,120,.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(tx(b.x), ty(b.y), b.width * S, b.height * S);
  ctx.fillStyle = 'rgba(150,220,150,.65)';
  for (let gx = b.x + 20; gx < b.x + b.width; gx += 55)
    for (let gy = b.y + 20; gy < b.y + b.height; gy += 55) {
      ctx.beginPath(); ctx.arc(tx(gx), ty(gy), 3, 0, 7); ctx.fill();
    }
  ctx.fillStyle = '#bfe3bf'; ctx.font = 'bold 10px system-ui';
  ctx.fillText(f.label, tx(b.x) + 4, ty(b.y) + 12);
}

// --- roads -----------------------------------------------------------------
for (const r of D.ROADS) {
  ctx.strokeStyle = r.surface === 'asphalt' ? '#4a5260' : '#6d6350';
  ctx.lineWidth = r.width * S;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  r.points.forEach((p, i) => i ? ctx.lineTo(tx(p[0]), ty(p[1])) : ctx.moveTo(tx(p[0]), ty(p[1])));
  ctx.stroke();
}
ctx.font = 'bold 10px monospace';
ctx.fillStyle = '#c9bb9a';
for (const r of D.ROADS) {
  const p = r.points[Math.floor(r.points.length / 2)];
  ctx.fillText(r.id, tx(p[0]) + 4, ty(p[1]) - 4);
}

// --- zones -----------------------------------------------------------------
const ZONE_FILL = { pitch:'#2f7a3a', calisthenics:'#8d4a30', cinema:'#3a5c2c', parking:'#3b414b' };
for (const z of D.ZONES) {
  const b = z.bounds;
  ctx.fillStyle = ZONE_FILL[z.kind] || '#444';
  ctx.fillRect(tx(b.x), ty(b.y), b.width * S, b.height * S);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.strokeRect(tx(b.x), ty(b.y), b.width * S, b.height * S);
  ctx.fillStyle = '#e8f0e0'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  const za = D.LABELS.zones[D.ZONES.indexOf(z)];
  ctx.fillText(z.label, tx(za[0]), ty(za[1]));
  ctx.textAlign = 'left';
}

// --- buildings -------------------------------------------------------------
const B_FILL = { dorm:'#c04a3e', canteen:'#6f7d92', office:'#3d8a80' };
// Two rotations, matching campus.ts: each wing turns about its own centre,
// then the block turns the lot about its pivot.
const rot = (x, y, cx, cy, deg) => {
  if (!deg) return [x, y];
  const r = deg*Math.PI/180, co = Math.cos(r), si = Math.sin(r);
  const dx = x - cx, dy = y - cy;
  return [cx + dx*co - dy*si, cy + dx*si + dy*co];
};
const partOutline = p => {
  const cx = p.x + p.width/2, cy = p.y + p.height/2;
  return [[p.x,p.y],[p.x+p.width,p.y],[p.x+p.width,p.y+p.height],[p.x,p.y+p.height]]
    .map(([x,y]) => rot(x, y, cx, cy, p.rotation || 0));
};
const pivotOf = b => {
  const pts = b.parts.flatMap(partOutline);
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  return { x: (Math.min(...xs)+Math.max(...xs))/2, y: (Math.min(...ys)+Math.max(...ys))/2 };
};
for (const b of D.BUILDINGS) {
  const c = pivotOf(b);
  for (const p of b.parts) {
    const poly = partOutline(p).map(([x,y]) => rot(x, y, c.x, c.y, b.rotation || 0));
    ctx.beginPath();
    poly.forEach(([x,y], i) => i ? ctx.lineTo(tx(x), ty(y)) : ctx.moveTo(tx(x), ty(y)));
    ctx.closePath();
    ctx.fillStyle = B_FILL[b.kind] || '#999';
    ctx.fill();
    ctx.strokeStyle = '#1a1220'; ctx.lineWidth = 2; ctx.stroke();
  }
  const spins = b.parts.map(p => p.rotation || 0);
  const tag = b.label
    + (b.rotation ? '  ' + b.rotation + '°' : '')
    + (spins.some(v => v) ? '  [' + spins.join('/') + ']' : '');
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  const ba = D.LABELS.buildings[D.BUILDINGS.indexOf(b)];
  ctx.strokeText(tag, tx(ba[0]), ty(ba[1]));
  ctx.fillText(tag, tx(ba[0]), ty(ba[1]));
  ctx.textAlign = 'left';
}

// --- stands ----------------------------------------------------------------
for (const s of D.STANDS) {
  const w = 240 * S, h = 146 * S;
  ctx.fillStyle = D.STAND_COLORS[s.color % D.STAND_COLORS.length];
  ctx.globalAlpha = 0.85;
  ctx.fillRect(tx(s.x) - w / 2, ty(s.y) - h, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(tx(s.x) - w / 2, ty(s.y) - h, w, h);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
  ctx.strokeText(s.label, tx(s.x), ty(s.y) - h / 2);
  ctx.fillText(s.label, tx(s.x), ty(s.y) - h / 2);
  ctx.textAlign = 'left';
}

// --- scenery ---------------------------------------------------------------
ctx.fillStyle = 'rgba(90,190,90,0.55)';
for (const t of D.TREES) { ctx.beginPath(); ctx.arc(tx(t.x), ty(t.y), 5, 0, 7); ctx.fill(); }
ctx.fillStyle = 'rgba(90,160,90,0.4)';
for (const b of D.BUSHES) { ctx.beginPath(); ctx.arc(tx(b.x), ty(b.y), 3, 0, 7); ctx.fill(); }
ctx.fillStyle = 'rgba(255,220,120,0.5)';
for (const l of D.LAMPS) { ctx.fillRect(tx(l[0]) - 1.5, ty(l[1]) - 1.5, 3, 3); }

// --- fence, drawn last so it sits on top -----------------------------------
ctx.strokeStyle = '#d8cba8';
ctx.lineWidth = 4;
ctx.lineCap = 'butt';
// Same rule as the game: each side minus whatever opening a nearby gate cuts.
for (const f of D.FENCE_LINES) {
  const last = f.closed ? f.points.length : f.points.length - 1;
  for (let i = 0; i < last; i++) {
    const a = f.points[i], b = f.points[(i + 1) % f.points.length];
    const len = Math.hypot(b[0]-a[0], b[1]-a[1]);
    if (len < 1) continue;
    const ux = (b[0]-a[0])/len, uy = (b[1]-a[1])/len;
    const at = d => [a[0] + ux*d, a[1] + uy*d];

    const holes = [];
    for (const g of D.GATES) {
      const t = Math.max(0, Math.min(1, ((g.x-a[0])*ux + (g.y-a[1])*uy) / len));
      const px = a[0] + ux*len*t, py = a[1] + uy*len*t;
      if (Math.hypot(g.x-px, g.y-py) > 80) continue;
      const along = (g.x-a[0])*ux + (g.y-a[1])*uy;
      holes.push([Math.max(0, along - g.opening/2), Math.min(len, along + g.opening/2)]);
    }
    holes.sort((p, q) => p[0] - q[0]);

    const run = (from, to) => {
      const [x0, y0] = at(from), [x1, y1] = at(to);
      ctx.beginPath(); ctx.moveTo(tx(x0), ty(y0)); ctx.lineTo(tx(x1), ty(y1)); ctx.stroke();
    };
    let cursor = 0;
    for (const h of holes) { if (h[0] > cursor) run(cursor, h[0]); cursor = Math.max(cursor, h[1]); }
    if (cursor < len) run(cursor, len);
  }
}

// --- gates + spawn ---------------------------------------------------------
for (const g of D.GATES) {
  ctx.strokeStyle = g.main ? '#ff4d4d' : '#4dff88';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(tx(g.x), ty(g.y), 13, 0, 7); ctx.stroke();
  ctx.fillStyle = g.main ? '#ff8f8f' : '#8fffb4';
  ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  const ga = D.LABELS.gates[D.GATES.indexOf(g)];
  ctx.fillText(g.label, tx(ga[0]), ty(ga[1]));
  ctx.textAlign = 'left';
}
ctx.fillStyle = '#ffd84d';
ctx.beginPath(); ctx.arc(tx(D.SPAWN.x), ty(D.SPAWN.y), 7, 0, 7); ctx.fill();
ctx.fillStyle = '#ffd84d'; ctx.font = 'bold 11px system-ui';
ctx.fillText('START', tx(D.SPAWN.x) + 10, ty(D.SPAWN.y) + 4);

ctx.fillStyle = 'rgba(255,255,255,0.5)';
ctx.font = '11px monospace';
ctx.fillText('lume ' + D.WORLD_WIDTH + 'x' + D.WORLD_HEIGHT + '  ·  grila 500  ·  rosu = intrare principala, verde = secundara', M, ${HEIGHT} - 16);
</script>`

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, 'out')
mkdirSync(outDir, { recursive: true })

const htmlPath = join(outDir, 'campus.html')
const pngPath = join(outDir, 'campus.png')
writeFileSync(htmlPath, page, 'utf8')

execFileSync(
  findBrowser(),
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    // Outside the project: a Chrome profile here would be picked up by the
    // Vite dev server watcher, which dies on its locked session files.
    `--user-data-dir=${join(tmpdir(), 'pisica-map-render')}`,
    `--screenshot=${pngPath}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    pathToFileURL(htmlPath).href,
  ],
  { stdio: 'ignore' },
)

console.log(`blueprint: ${pngPath}  (${WIDTH}x${HEIGHT})`)
