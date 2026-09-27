/**
 * One palette for the whole game. Everything is drawn from these values so the
 * art reads as a single hand-made set instead of a pile of unrelated colours.
 *
 * The anchor is the real campus: terracotta roofs, cream walls, a lot of green.
 * Saturation is pushed up and values are kept warm to land on "cartoon", and a
 * single near-black ink colour outlines every object to hold it all together.
 */

export const INK = '#2a2135'
export const INK_SOFT = 'rgba(42, 33, 53, 0.22)'

export const PALETTE = {
  ink: INK,
  inkSoft: INK_SOFT,

  grass: '#6ec052',
  grassMid: '#5faf45',
  grassDark: '#4d963a',
  grassLight: '#84d165',
  forestFloor: '#2f5c31',
  forestFloorMid: '#27502a',
  forestFloorDark: '#1e4423',
  forestFloorLight: '#3a6b39',

  path: '#e5d3ad',
  pathEdge: '#cbb488',
  plaza: '#ded0bb',

  asphalt: '#5d6675',
  asphaltLight: '#6e7787',
  roadLine: '#f3efe2',

  roof: '#d6483d',
  roofLight: '#e9685a',
  roofDark: '#a8342c',
  roofRidge: '#f0897c',

  wall: '#f4e8d2',
  wallShade: '#dcc9a8',

  cantinaRoof: '#7c8aa0',
  cantinaRoofLight: '#94a2b6',
  cantinaRoofDark: '#5d6a7d',

  officeRoof: '#3f8f86',
  officeRoofLight: '#57aaa0',
  officeRoofDark: '#2e6d66',

  window: '#8fd3f0',
  windowDark: '#5fa9cc',

  treeCanopy: '#3f9a46',
  treeCanopyLight: '#5cb85c',
  treeCanopyDark: '#2f7a37',
  treeTrunk: '#7a5334',

  bushLight: '#6cbf52',
  bushDark: '#46963f',

  catFur: '#f2953f',
  catFurDark: '#d2742a',
  catFurLight: '#ffb968',
  catCream: '#fde6c4',
  catNose: '#f2879a',
  catEye: '#3fa67a',

  pitch: '#4aa653',
  pitchStripe: '#56b45e',
  pitchLine: '#f4f1e6',
  court: '#c96a45',

  medal: '#ffcb3d',
  medalDark: '#e0a41f',
  medalRibbon: '#3b6fd4',

  standWood: '#b57a46',
  standWoodDark: '#8d5b32',

  sky: '#bfe4f5',
  water: '#59b4dd',
} as const

/**
 * One accent per OSUT department, so every booth is distinguishable from across
 * the map. Neighbouring stands never share a hue family.
 */
export const STAND_COLORS = [
  '#3b6fd4', // Balul Bobocilor
  '#e7563f', // Polihack
  '#41a88a', // Sport și Sănătate
  '#f2a93b', // Viitor Inginer
  '#8b5cc7', // Infotech
  '#e0518f', // Divertisment
  '#2f9fd0',
  '#d1642c', // Imagine
  '#5fa83c', // IT
  '#c23b6a', // Media
  '#e8a33d', // PR
  '#4c62c4', // Tehnic
  '#2fa37a', // Tineret
  '#b8484f', // Financiar
] as const

export function toNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16)
}
