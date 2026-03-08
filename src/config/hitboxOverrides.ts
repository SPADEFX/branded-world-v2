export interface HitboxDefinition {
  offsetX: number
  offsetZ: number
  halfW: number
  halfD: number
  height: number
  shape?: 'box' | 'circle'  // default 'box'; circle uses halfW as radius
}

export interface ModelHitboxConfig {
  mode: 'auto' | 'manual' | 'none'
  autoScale?: number
  hitboxes: HitboxDefinition[]
}

const STORAGE_KEY = 'hitbox-overrides'

export const HITBOX_OVERRIDES: Record<string, ModelHitboxConfig> = {}

/** Load saved overrides from localStorage on startup. */
export function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as Record<string, ModelHitboxConfig>
    Object.assign(HITBOX_OVERRIDES, data)
  } catch {
    // ignore corrupt data
  }
}

/** Save current overrides to localStorage. */
export function saveOverrides() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(HITBOX_OVERRIDES))
}

// Auto-load on module init
if (typeof window !== 'undefined') {
  loadOverrides()
}
