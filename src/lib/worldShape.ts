// ---------------------------------------------------------------------------
// World Shape — polygon boundaries, biome detection, shore distance
// Single source of truth for the continent geometry.
// ---------------------------------------------------------------------------

// ── Main continent polygon (irregular coastline) ────────────────────────────
// Vertices in (x, z) world coordinates, counter-clockwise.
// Origin (0,0) is the village center.

export const CONTINENT_POLY: [number, number][] = [
  // North (mountain zone)
  [0, -52],
  [12, -54],
  [28, -48],
  [38, -38],
  // Northeast bay
  [48, -22],
  [52, -8],
  // East bulge
  [54, 8],
  [50, 18],
  // Southeast (bridge exit)
  [48, 28],
  [42, 36],
  // South peninsula
  [30, 44],
  [15, 48],
  [0, 46],
  [-12, 48],
  // Southwest
  [-28, 42],
  [-38, 32],
  // West bay
  [-48, 18],
  [-52, 4],
  [-50, -10],
  // Northwest
  [-44, -28],
  [-34, -40],
  [-20, -50],
  [-8, -53],
]

// ── Secondary island polygon ─────────────────────────────────────────────
export const SECONDARY_ISLAND_POLY: [number, number][] = [
  [62, 22],
  [72, 18],
  [80, 22],
  [82, 30],
  [78, 38],
  [70, 40],
  [62, 36],
  [58, 28],
]

// ── Bridge endpoints ──────────────────────────────────────────────────────
export const BRIDGE_START: [number, number] = [49, 28]
export const BRIDGE_END: [number, number] = [60, 28]
export const BRIDGE_WIDTH = 3

// ── Point-in-polygon (winding number algorithm) ─────────────────────────

function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let winding = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const [x1, z1] = poly[i]
    const [x2, z2] = poly[(i + 1) % n]
    if (z1 <= z) {
      if (z2 > z) {
        // Upward crossing
        const cross = (x2 - x1) * (z - z1) - (x - x1) * (z2 - z1)
        if (cross > 0) winding++
      }
    } else {
      if (z2 <= z) {
        // Downward crossing
        const cross = (x2 - x1) * (z - z1) - (x - x1) * (z2 - z1)
        if (cross < 0) winding--
      }
    }
  }
  return winding !== 0
}

/** Check if a point is on the main continent */
export function isInsideContinent(x: number, z: number): boolean {
  return pointInPolygon(x, z, CONTINENT_POLY)
}

/** Check if a point is on the secondary island */
export function isInsideSecondaryIsland(x: number, z: number): boolean {
  return pointInPolygon(x, z, SECONDARY_ISLAND_POLY)
}

/** Check if a point is on the bridge */
export function isOnBridge(x: number, z: number): boolean {
  const [sx, sz] = BRIDGE_START
  const [ex, ez] = BRIDGE_END
  const dx = ex - sx
  const dz = ez - sz
  const len = Math.sqrt(dx * dx + dz * dz)
  const nx = dx / len
  const nz = dz / len

  // Project point onto bridge line
  const px = x - sx
  const pz = z - sz
  const along = px * nx + pz * nz
  if (along < -1 || along > len + 1) return false

  // Perpendicular distance
  const perp = Math.abs(px * (-nz) + pz * nx)
  return perp < BRIDGE_WIDTH / 2
}

/** Check if a point is on any walkable land */
export function isInsideLand(x: number, z: number): boolean {
  return isInsideContinent(x, z) || isInsideSecondaryIsland(x, z) || isOnBridge(x, z)
}

// ── Distance to nearest polygon edge ────────────────────────────────────

function distToSegment(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number,
): number {
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2)

  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cz = az + t * dz
  return Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2)
}

function distToPolygonEdge(x: number, z: number, poly: [number, number][]): number {
  let minDist = Infinity
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const [ax, az] = poly[i]
    const [bx, bz] = poly[(i + 1) % n]
    const d = distToSegment(x, z, ax, az, bx, bz)
    if (d < minDist) minDist = d
  }
  return minDist
}

/** Signed distance to shore. Positive = inside land, negative = in water. */
export function distanceToShore(x: number, z: number): number {
  // Check all land polygons and return the smallest distance
  const onContinent = isInsideContinent(x, z)
  const onSecondary = isInsideSecondaryIsland(x, z)
  const onBridgeLand = isOnBridge(x, z)

  const dContinent = distToPolygonEdge(x, z, CONTINENT_POLY)
  const dSecondary = distToPolygonEdge(x, z, SECONDARY_ISLAND_POLY)

  // Find the closest shore edge
  let minDist = Math.min(dContinent, dSecondary)

  // Sign: positive inside, negative outside
  if (onContinent || onSecondary || onBridgeLand) {
    return minDist
  } else {
    return -minDist
  }
}

// ── Biome detection ─────────────────────────────────────────────────────

export type Biome = 'village' | 'forest' | 'beach' | 'mountain'

export function getBiome(x: number, z: number): Biome {
  const distFromCenter = Math.sqrt(x * x + z * z)
  const edgeDist = distToPolygonEdge(x, z, CONTINENT_POLY)

  // On secondary island
  if (isInsideSecondaryIsland(x, z)) return 'forest'

  // Village center
  if (distFromCenter < 18) return 'village'

  // Mountain zone — north sector (z < -20) and near the edge
  if (z < -20 && edgeDist < 18) return 'mountain'

  // Beach/Harbor — south sector (z > 20) and near the edge
  if (z > 20 && edgeDist < 15) return 'beach'

  // Everything else in between is forest
  return 'forest'
}

// ── Seeded pseudo-random for consistent procedural placement ────────────

let _seed = 42
export function resetSeed(s = 42) { _seed = s }
export function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647
  return (_seed - 1) / 2147483646
}
