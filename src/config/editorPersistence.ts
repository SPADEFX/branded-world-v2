import type { EditorObject } from '@/stores/editorStore'
import { saveOverrides } from '@/config/hitboxOverrides'

const STATE_KEY = 'editor-state'

interface SavedState {
  positions: Record<string, { position: [number, number, number]; rotation: number }>
  hiddenIds: string[]
  dynamicObjects: EditorObject[]
}

/** Position overrides loaded from localStorage — checked by M/Tex on mount */
export const positionOverrides: Record<
  string,
  { position: [number, number, number]; rotation: number }
> = {}

/** Hidden IDs loaded from localStorage — used to init editorStore */
export let savedHiddenIds: string[] = []

/** Dynamic objects loaded from localStorage — used to init editorStore */
export let savedDynamicObjects: EditorObject[] = []

export function loadEditorState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as SavedState
    if (data.positions) Object.assign(positionOverrides, data.positions)
    if (data.hiddenIds) savedHiddenIds = data.hiddenIds
    if (data.dynamicObjects) savedDynamicObjects = data.dynamicObjects
  } catch {
    // ignore corrupt data
  }
}

export function saveEditorState(
  objects: Record<string, EditorObject>,
  hiddenIds: Set<string>,
  dynamicObjects: EditorObject[],
) {
  // Save position/rotation for all registered objects
  const positions: SavedState['positions'] = {}
  for (const [id, obj] of Object.entries(objects)) {
    positions[id] = {
      position: obj.position.map((v) => Math.round(v * 1000) / 1000) as [number, number, number],
      rotation: Math.round(obj.rotation * 1000) / 1000,
    }
  }

  const state: SavedState = {
    positions,
    hiddenIds: [...hiddenIds],
    dynamicObjects: dynamicObjects.map((o) => ({
      ...o,
      position: o.position.map((v) => Math.round(v * 1000) / 1000) as [number, number, number],
      rotation: Math.round(o.rotation * 1000) / 1000,
    })),
  }

  localStorage.setItem(STATE_KEY, JSON.stringify(state))

  // Also save hitbox overrides
  saveOverrides()

  // Update positionOverrides in memory
  Object.keys(positionOverrides).forEach((k) => delete positionOverrides[k])
  Object.assign(positionOverrides, positions)
}

// Auto-load on module init
if (typeof window !== 'undefined') {
  loadEditorState()
}
