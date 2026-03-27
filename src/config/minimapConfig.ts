/**
 * Minimap configuration.
 *
 * CALIBRATION:
 * 1. Take a top-down screenshot from the editor (Editor → top-down camera).
 * 2. Drop it as public/ui/minimap.png (square crop recommended, e.g. 512×512).
 * 3. Adjust MINIMAP_WORLD bounds so the four corners of the screenshot match
 *    the corresponding world coordinates.
 * 4. Adjust MINIMAP_ZONES to match the actual areas visible on the map.
 *
 * WORLD COORDS: Three.js space — X = east/west, Z = south/north (negative = north).
 */

export const MINIMAP_WORLD = {
  xMin: -75,
  xMax: 75,
  zMin: -80,
  zMax: 65,
}

/** Flip Z axis if your top-down screenshot has north at the bottom */
export const MINIMAP_FLIP_Z = false

export const MINIMAP_SIZE = 180 // rendered canvas size in px

export interface MinimapZoneDef {
  id: string
  label: string
  /** World space AABB — player must be inside to trigger discovery */
  xMin: number
  xMax: number
  zMin: number
  zMax: number
}

/**
 * Named areas on the map.
 * Player entering one of these for the first time triggers a notification and reveals that area on the minimap.
 * Adjust these to match your actual map layout.
 */
export const MINIMAP_ZONES: MinimapZoneDef[] = [
  // Central spawn area (welcome zone nearby)
  { id: 'spawn',      label: 'Place centrale',   xMin: -18, xMax: 18, zMin:   5, zMax: 28 },
  // East quarter (product zone at [20, 0, 5])
  { id: 'east',       label: 'Quartier Est',      xMin:  12, xMax: 45, zMin: -12, zMax: 18 },
  // Southeast (how-it-works at [12, 0, -18])
  { id: 'south_east', label: 'Sud-Est',           xMin:   5, xMax: 35, zMin: -35, zMax: -8 },
  // Southwest (community at [-12, 0, -18])
  { id: 'south_west', label: 'Sud-Ouest',         xMin: -35, xMax:  -5, zMin: -35, zMax: -8 },
  // West quarter (cta at [-20, 0, 5])
  { id: 'west',       label: 'Quartier Ouest',    xMin: -45, xMax: -12, zMin: -12, zMax: 18 },
  // Far north
  { id: 'north',      label: 'Collines du Nord',  xMin: -30, xMax:  30, zMin: -70, zMax: -30 },
  // Far east tip
  { id: 'far_east',   label: 'Pointe Est',        xMin:  40, xMax:  75, zMin: -25, zMax: 15 },
  // Far west tip
  { id: 'far_west',   label: 'Pointe Ouest',      xMin: -75, xMax: -40, zMin: -25, zMax: 15 },
]
