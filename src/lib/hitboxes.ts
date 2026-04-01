import * as THREE from 'three'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'

// ── Player dimensions ───────────────────────────────────────────────────────
export const PLAYER_RADIUS = 0.25
export const PLAYER_HEIGHT = 1.8

// ── Skip list — decorative / walkable objects ───────────────────────────────
const NO_COLLISION_PATTERNS = [
  'grass', 'flower', 'patch-grass', 'debris', 'debris-wood',
  'road', 'floor', 'platform-planks', 'detail-plate', 'detail-bowl', 'detail-chalice',
  'candle', 'bottle', 'fish', 'shovel', 'tool-', 'pumpkin',
  'hay-bale', 'bedroll', 'signpost', 'flag',
  'tower-watch', 'mast', 'plant_bush', 'campfire',
  'buoy', 'boat-', 'ship-wreck', 'rocks-sand',
]

// Objects that block walking (XZ push-out) but can NOT be landed on top of
const NO_LANDING_PATTERNS = [
  'tree_', 'Tree_', 'palm-', 'Bush_', 'log', 'stump_',
]

export function shouldSkipCollision(modelPath: string): boolean {
  const name = modelPath.split('/').pop()?.replace('.glb', '') ?? ''
  return NO_COLLISION_PATTERNS.some((p) => name.startsWith(p))
}

export function shouldSkipLanding(id: string): boolean {
  return NO_LANDING_PATTERNS.some((p) => id.includes(p))
}

/** Trunk radius for tree/palm/bush models — much smaller than the full canopy AABB. */
const TRUNK_RADIUS = 0.3

function isTrunkModel(modelPath: string): boolean {
  const name = modelPath.split('/').pop()?.replace('.glb', '') ?? ''
  return NO_LANDING_PATTERNS.some((p) => name.startsWith(p))
}

// ── Hitbox data ─────────────────────────────────────────────────────────────
export interface Hitbox {
  x: number
  z: number
  halfW: number    // half-extent in X (or radius for circle)
  halfD: number    // half-extent in Z (ignored for circle)
  minY: number     // bottom of the box (Y)
  height: number   // top of the box (Y)
  rotY?: number    // rotation around Y axis (radians) — enables OBB collision
  circle?: boolean // true = circle collision (halfW = radius)
  baseName?: string // prop type — set for dc_ detailmisc hitboxes
}

export const hitboxMap: Record<string, Hitbox> = {}

// Original dims before any scale override — keyed by hitbox id
interface OrigDim {
  localHalfW: number   // half-extent in object's LOCAL X
  localHalfD: number   // half-extent in object's LOCAL Z
  instanceRotY: number // world rotation Y of the instance (radians)
  cx: number; cz: number // world center XZ
  minY: number; height: number // world Y range (no override)
}
const _origDims: Record<string, OrigDim> = {}

// ── Hitbox shape overrides (hardcoded — edit here to make permanent) ──────────
// Update via prop viewer UI then click "Copier config" to get the TS snippet.
export interface SubBox { ox: number; oz: number; oy?: number; hw: number; hd: number }
export interface ArchConfig { ecartement: number; rayon: number }
export interface HitboxOverride { w: number; d: number; h: number; rotY: number; subBoxes?: SubBox[]; arch?: ArchConfig }

const HITBOX_SHAPE_OVERRIDES: Record<string, HitboxOverride> = {
  'SM_Prop_Lamp_Post_01': { w: 0.5, d: 0.5, h: 1, rotY: 0 * Math.PI / 180 },
}

/** Returns sub-box definitions for props that need a split hitbox (e.g. arches). */
export function getHitboxSubBoxes(baseName: string): SubBox[] | undefined {
  return HITBOX_SHAPE_OVERRIDES[baseName]?.subBoxes
}

/** Returns arch config (two symmetric pillars) if defined for this prop. */
export function getHitboxArch(baseName: string): ArchConfig | undefined {
  return HITBOX_SHAPE_OVERRIDES[baseName]?.arch
}

// In-session mutable copy — starts from hardcoded values, updated by UI
export const hitboxScales: Record<string, HitboxOverride> = Object.fromEntries(
  Object.entries(HITBOX_SHAPE_OVERRIDES).map(([k, v]) => [k, { ...v }])
)

export function applyHitboxScale(baseName: string, w: number, d: number, h: number, rotYOffset: number) {
  hitboxScales[baseName] = { w, d, h, rotY: rotYOffset }
  let count = 0
  for (const id in _origDims) {
    if (hitboxMap[id]?.baseName !== baseName) continue
    count++
    const o = _origDims[id]
    const midY  = (o.minY + o.height) / 2
    const halfH = (o.height - o.minY) / 2
    hitboxMap[id] = {
      ...hitboxMap[id],
      x: o.cx, z: o.cz,
      halfW:  o.localHalfW * w,
      halfD:  o.localHalfD * d,
      minY:   midY - halfH * h,
      height: midY + halfH * h,
      rotY:   o.instanceRotY + rotYOffset,
    }
  }
  console.log(`[hitboxScale] ${baseName} → w=${w} d=${d} h=${h} rot=${rotYOffset.toFixed(2)} | updated ${count} hitboxes`)
}

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
  minY = 0,
  baseName?: string,
  instanceRotY = 0,
) {
  hitboxMap[id] = { x, z, halfW, halfD, minY, height, circle, baseName, rotY: instanceRotY || undefined }
  if (baseName) {
    _origDims[id] = {
      localHalfW: halfW, localHalfD: halfD,
      instanceRotY,
      cx: x, cz: z,
      minY, height,
    }
  }
}

export function unregisterHitbox(id: string) {
  delete hitboxMap[id]
  delete _origDims[id]
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

  // Trees/palms/bushes: use small trunk circle instead of full canopy AABB
  if (isTrunkModel(modelPath)) {
    const bounds = getModelBounds(modelPath, scene)
    registerHitbox(baseId, worldX, worldZ, TRUNK_RADIUS * scale, 0, bounds.height * scale, true)
    return
  }

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

/** Highest hitbox surface the player is standing on (for landing on props).
 *  Only counts a surface if the player's Y is already near or above it — prevents
 *  snapping the player up onto a prop they're just walking next to. */
export function getHitboxSurface(px: number, py: number, pz: number): number {
  const pr = PLAYER_RADIUS
  let best = 0
  for (const id in hitboxMap) {
    const hb = hitboxMap[id]
    if (shouldSkipLanding(id)) continue
    if (py < hb.height - 0.25) continue // player not near this surface yet
    let inside: boolean
    if (hb.circle) {
      const dx = px - hb.x, dz = pz - hb.z
      inside = dx * dx + dz * dz < (hb.halfW + pr) * (hb.halfW + pr)
    } else {
      inside = px > hb.x - hb.halfW - pr && px < hb.x + hb.halfW + pr
           && pz > hb.z - hb.halfD - pr && pz < hb.z + hb.halfD + pr
    }
    if (inside && hb.height > best) best = hb.height
  }
  return best
}

/** Check if the player is standing on a hitbox surface (within tolerance). */
export function getGroundHeight(px: number, py: number, pz: number): number {
  const pr = PLAYER_RADIUS
  let best = 0 // ground level
  for (const id in hitboxMap) {
    const hb = hitboxMap[id]
    if (shouldSkipLanding(id)) continue // trees etc. — no landing
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
    if (inside && py >= hb.minY - 0.1 && py >= hb.height - 0.01 && py <= hb.height + 0.1 && hb.height > best) {
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
      if (py + PLAYER_HEIGHT < hb.minY) continue // skip if hitbox is entirely above player's head

      const dx = x - hb.x
      const dz = z - hb.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const combined = hb.halfW + pr

      if (dist >= combined) continue // outside circle

      // Landing on top (skip for trees etc.)
      if (!shouldSkipLanding(id) && py >= hb.height - 0.05 && py <= hb.height + 0.15 && vy <= 0) {
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

    // ── Box collision (AABB or OBB if rotY set) ──
    if (py + PLAYER_HEIGHT < hb.minY) continue // skip if hitbox is entirely above player's head

    // Transform player into box local space if rotated
    const rot = hb.rotY ?? 0
    const cosR = Math.cos(rot), sinR = Math.sin(rot)
    const wdx = x - hb.x, wdz = z - hb.z
    const lx = wdx * cosR - wdz * sinR  // local X
    const lz = wdx * sinR + wdz * cosR  // local Z

    const left  = -hb.halfW - pr, right = hb.halfW + pr
    const front = -hb.halfD - pr, back  = hb.halfD + pr

    const insideX = lx > left && lx < right
    const insideZ = lz > front && lz < back

    // ── Landing on top ──
    if (!shouldSkipLanding(id) && insideX && insideZ && py >= hb.height - 0.05 && py <= hb.height + 0.15 && vy <= 0) {
      if (hb.height > landY) landY = hb.height
      continue
    }

    if (!insideX || !insideZ) continue
    if (py >= hb.height) continue

    // ── XZ push-out in local space, then rotate back to world ──
    const pushLeft  = lx - left, pushRight = right - lx
    const pushFront = lz - front, pushBack = back - lz

    const minPush = Math.min(pushLeft, pushRight, pushFront, pushBack)
    const capped = Math.min(minPush, 0.5)

    let pushLX = 0, pushLZ = 0
    if (minPush === pushLeft)       pushLX = -capped
    else if (minPush === pushRight) pushLX = +capped
    else if (minPush === pushFront) pushLZ = -capped
    else                            pushLZ = +capped

    // Rotate push vector back to world space
    const cosF = Math.cos(rot), sinF = Math.sin(rot)
    x += pushLX * cosF + pushLZ * sinF
    z += -pushLX * sinF + pushLZ * cosF
  }

  return [x, landY, z]
}
