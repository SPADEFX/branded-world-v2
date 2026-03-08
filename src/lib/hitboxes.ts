import * as THREE from 'three'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'

// ── Player dimensions ───────────────────────────────────────────────────────
export const PLAYER_RADIUS = 0.25

// ── Skip list — decorative / walkable objects ───────────────────────────────
const NO_COLLISION_PATTERNS = [
  'grass', 'flower', 'patch-grass', 'debris', 'debris-wood',
  'road', 'floor', 'platform-planks', 'detail-plate', 'detail-bowl', 'detail-chalice',
  'candle', 'bottle', 'fish', 'shovel', 'tool-', 'pumpkin',
  'hay-bale', 'bedroll', 'signpost', 'flag',
  'tower-watch', 'mast', 'plant_bush', 'campfire',
  'buoy', 'boat-', 'ship-wreck', 'rocks-sand',
]

export function shouldSkipCollision(modelPath: string): boolean {
  const name = modelPath.split('/').pop()?.replace('.glb', '') ?? ''
  return NO_COLLISION_PATTERNS.some((p) => name.startsWith(p))
}

// ── Hitbox data ─────────────────────────────────────────────────────────────
export interface Hitbox {
  x: number
  z: number
  halfW: number  // half-extent in X (or radius for circle)
  halfD: number  // half-extent in Z (ignored for circle)
  height: number // top of the box (Y)
  circle?: boolean // true = circle collision (halfW = radius)
}

export const hitboxMap: Record<string, Hitbox> = {}

// ── Bounds cache (per model path, before scale) ─────────────────────────────
interface ModelBounds {
  halfW: number
  halfD: number
  height: number
}

const boundsCache: Record<string, ModelBounds> = {}
const _box = new THREE.Box3()
const _size = new THREE.Vector3()

/** Compute & cache AABB half-extents + height from a GLB scene.
 *  Multiplied by 1.2 so the hitbox is slightly larger than the model. */
export function getModelBounds(modelPath: string, scene: THREE.Object3D): ModelBounds {
  if (!boundsCache[modelPath]) {
    _box.setFromObject(scene)
    _box.getSize(_size)
    const pad = 1.2
    boundsCache[modelPath] = {
      halfW: (_size.x / 2) * pad,
      halfD: (_size.z / 2) * pad,
      height: _size.y,
    }
  }
  return boundsCache[modelPath]
}

// ── Registration ────────────────────────────────────────────────────────────
export function registerHitbox(
  id: string,
  x: number,
  z: number,
  halfW: number,
  halfD: number,
  height: number,
  circle?: boolean,
) {
  hitboxMap[id] = { x, z, halfW, halfD, height, circle }
}

export function unregisterHitbox(id: string) {
  delete hitboxMap[id]
}

/** Nuke every entry in hitboxMap. Call bumpHitboxVersion() after to re-register. */
export function clearAllHitboxes() {
  for (const key in hitboxMap) {
    delete hitboxMap[key]
  }
}

// ── Model-level registration (checks overrides) ─────────────────────────────

/** Register hitbox(es) for a model, checking HITBOX_OVERRIDES first.
 *  Overrides take precedence over shouldSkipCollision. */
export function registerModelHitboxes(
  baseId: string,
  modelPath: string,
  worldX: number,
  worldZ: number,
  rotation: number,
  scale: number,
  scene: THREE.Object3D,
) {
  const override = HITBOX_OVERRIDES[modelPath]

  if (override) {
    if (override.mode === 'none') return

    if (override.mode === 'manual') {
      override.hitboxes.forEach((hb, idx) => {
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)
        const rx = hb.offsetX * cos - hb.offsetZ * sin
        const rz = hb.offsetX * sin + hb.offsetZ * cos
        const subId = idx === 0 ? baseId : `${baseId}__sub${idx}`
        registerHitbox(
          subId,
          worldX + rx * scale,
          worldZ + rz * scale,
          hb.halfW * scale,
          hb.halfD * scale,
          hb.height * scale,
          hb.shape === 'circle',
        )
      })
      return
    }

    // mode === 'auto' with custom autoScale
    if (shouldSkipCollision(modelPath)) return
    const bounds = getModelBoundsWithScale(modelPath, scene, override.autoScale ?? 1.2)
    registerHitbox(baseId, worldX, worldZ, bounds.halfW * scale, bounds.halfD * scale, bounds.height * scale)
    return
  }

  // No override — default auto behavior
  if (shouldSkipCollision(modelPath)) return
  const bounds = getModelBounds(modelPath, scene)
  registerHitbox(baseId, worldX, worldZ, bounds.halfW * scale, bounds.halfD * scale, bounds.height * scale)
}

/** Unregister all hitboxes for a model (including any sub-hitboxes).
 *  Always cleans up base + all __subN entries regardless of current override state. */
export function unregisterModelHitboxes(baseId: string, _modelPath?: string) {
  delete hitboxMap[baseId]
  const prefix = `${baseId}__sub`
  for (const key in hitboxMap) {
    if (key.startsWith(prefix)) {
      delete hitboxMap[key]
    }
  }
}

/** Like getModelBounds but with a custom padding multiplier. */
function getModelBoundsWithScale(modelPath: string, scene: THREE.Object3D, pad: number): ModelBounds {
  const key = `${modelPath}__pad${pad}`
  if (!boundsCache[key]) {
    _box.setFromObject(scene)
    _box.getSize(_size)
    boundsCache[key] = {
      halfW: (_size.x / 2) * pad,
      halfD: (_size.z / 2) * pad,
      height: _size.y,
    }
  }
  return boundsCache[key]
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Check if the player is standing on a hitbox surface (within tolerance). */
export function getGroundHeight(px: number, py: number, pz: number): number {
  const pr = PLAYER_RADIUS
  let best = 0 // ground level
  for (const id in hitboxMap) {
    const hb = hitboxMap[id]
    let inside: boolean
    if (hb.circle) {
      const dx = px - hb.x
      const dz = pz - hb.z
      inside = dx * dx + dz * dz < (hb.halfW + pr) * (hb.halfW + pr)
    } else {
      const insideX = px > hb.x - hb.halfW - pr && px < hb.x + hb.halfW + pr
      const insideZ = pz > hb.z - hb.halfD - pr && pz < hb.z + hb.halfD + pr
      inside = insideX && insideZ
    }
    if (inside && Math.abs(py - hb.height) < 0.1 && hb.height > best) {
      best = hb.height
    }
  }
  return best
}

// ── Collision resolution ────────────────────────────────────────────────────

/** Resolve AABB collisions. Returns [newX, landingY, newZ].
 *  landingY > 0 means the player should land on top of a box. */
export function resolveCollisions(
  px: number,
  py: number,
  pz: number,
  vy: number,
): [number, number, number] {
  let x = px
  let z = pz
  let landY = 0 // highest surface the player is standing on

  const pr = PLAYER_RADIUS

  for (const id in hitboxMap) {
    const hb = hitboxMap[id]

    if (hb.circle) {
      // ── Circle collision ──
      const dx = x - hb.x
      const dz = z - hb.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const combined = hb.halfW + pr

      if (dist >= combined) continue // outside circle

      // Landing on top
      if (py >= hb.height - 0.05 && vy <= 0) {
        if (hb.height > landY) landY = hb.height
        continue
      }

      // XZ push-out (only when below the top)
      if (py >= hb.height) continue

      const penetration = combined - dist
      const capped = Math.min(penetration, 0.5)
      if (dist > 0.001) {
        x += (dx / dist) * capped
        z += (dz / dist) * capped
      } else {
        x += capped // degenerate case: player exactly at center
      }
      continue
    }

    // ── Box (AABB) collision ──
    // Expanded box edges (account for player radius)
    const left = hb.x - hb.halfW - pr
    const right = hb.x + hb.halfW + pr
    const front = hb.z - hb.halfD - pr
    const back = hb.z + hb.halfD + pr

    const insideX = x > left && x < right
    const insideZ = z > front && z < back

    // ── Landing on top ──
    // Player is above or at box top and within XZ footprint
    if (insideX && insideZ && py >= hb.height - 0.05 && vy <= 0) {
      // Check if this box top is the highest surface under the player
      if (hb.height > landY) {
        landY = hb.height
      }
      continue // don't push sideways when on top
    }

    // ── XZ push-out (only when player is below the box top) ──
    if (!insideX || !insideZ) continue
    if (py >= hb.height) continue

    // Find the smallest push to exit the box
    const pushLeft = x - left   // distance to left edge
    const pushRight = right - x // distance to right edge
    const pushFront = z - front // distance to front edge
    const pushBack = back - z   // distance to back edge

    const minPush = Math.min(pushLeft, pushRight, pushFront, pushBack)
    const capped = Math.min(minPush, 0.5) // cap to prevent teleporting

    if (minPush === pushLeft) x -= capped
    else if (minPush === pushRight) x += capped
    else if (minPush === pushFront) z -= capped
    else z += capped
  }

  return [x, landY, z]
}
