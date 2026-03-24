import { create } from 'zustand'
import * as THREE from 'three'
import { savedHiddenIds, savedDynamicObjects } from '@/config/editorPersistence'
import { type DoorTrigger, loadSavedDoors, persistDoors } from '@/config/indoorZones'

export interface EditorObject {
  id: string
  model: string
  category: string
  position: [number, number, number]
  rotation: number
  scale: number
}

export interface UndoEntry {
  id: string
  position: [number, number, number]
  rotation: number
}

interface EditorState {
  enabled: boolean
  selectedId: string | null
  mode: 'translate' | 'rotate'
  dragging: boolean
  eraserMode: boolean
  teleportMode: boolean
  placeDoorMode: boolean
  viewDoorsMode: boolean
  placedDoors: DoorTrigger[]
  selectedDoorId: string | null
  cameraMode: 'follow' | 'top' | 'free'
  objects: Record<string, EditorObject>
  dynamicObjects: EditorObject[]
  hiddenIds: Set<string>
  undoStack: UndoEntry[]
  toggle: () => void
  select: (id: string | null) => void
  setMode: (mode: 'translate' | 'rotate') => void
  setDragging: (d: boolean) => void
  setEraserMode: (mode: boolean) => void
  setTeleportMode: (mode: boolean) => void
  setPlaceDoorMode: (mode: boolean) => void
  doorTransformMode: 'grab' | 'rotate' | 'scale' | null
  doorViewStyle: 'xray' | 'full' | 'wireframe'
  freeCamActive: boolean
  setFreeCamActive: (v: boolean) => void
  cullingDebug: boolean
  setCullingDebug: (v: boolean) => void
  collisionManagerOpen: boolean
  setCollisionManagerOpen: (v: boolean) => void
  propViewerOpen: boolean
  propViewerIndex: number
  setPropViewerOpen: (v: boolean) => void
  setPropViewerIndex: (v: number) => void
  setViewDoorsMode: (mode: boolean) => void
  setDoorTransformMode: (mode: 'grab' | 'rotate' | 'scale' | null) => void
  setDoorViewStyle: (style: 'xray' | 'full' | 'wireframe') => void
  selectDoor: (id: string | null) => void
  addDoor: (door: DoorTrigger) => void
  updateDoor: (id: string, partial: Partial<DoorTrigger>) => void
  removeDoor: (id: string) => void
  flipDoor: (id: string) => void
  rotateDoor: (id: string, delta: number) => void
  renameDoor: (id: string, name: string) => void
  setCameraMode: (mode: 'follow' | 'top' | 'free') => void
  register: (obj: EditorObject) => void
  updatePosition: (id: string, pos: THREE.Vector3) => void
  updateRotation: (id: string, rot: number) => void
  addObject: (obj: EditorObject) => void
  removeObject: (id: string) => void
  pushUndo: (entry: UndoEntry) => void
  undo: () => void
  hitboxVersion: number
  bumpHitboxVersion: () => void
}

/** Mutable ref map — stores Object3D refs for TransformControls */
export const editorRefs: Record<string, THREE.Object3D> = {}

// Init counter past any saved dynamic IDs to avoid conflicts
let _dynId = savedDynamicObjects.reduce((max, o) => {
  const m = o.id.match(/^dyn_(\d+)$/)
  return m ? Math.max(max, parseInt(m[1]) + 1) : max
}, 0)

export function nextDynId() {
  return `dyn_${_dynId++}`
}

export const useEditorStore = create<EditorState>((set) => ({
  enabled: false,
  selectedId: null,
  mode: 'translate',
  dragging: false,
  eraserMode: false,
  teleportMode: false,
  placeDoorMode: false,
  viewDoorsMode: false,
  freeCamActive: false,
  cullingDebug: false,
  collisionManagerOpen: false,
  propViewerOpen: false,
  propViewerIndex: 0,
  placedDoors: loadSavedDoors(),
  selectedDoorId: null,
  doorTransformMode: null,
  doorViewStyle: 'xray' as const,
  cameraMode: 'follow',
  objects: {},
  dynamicObjects: [...savedDynamicObjects],
  hiddenIds: new Set<string>(savedHiddenIds),
  undoStack: [],
  toggle: () =>
    set((s) => ({
      enabled: !s.enabled,
      selectedId: null,
      eraserMode: false,
      viewDoorsMode: false,
    })),
  select: (id) => set({ selectedId: id }),
  setMode: (mode) => set({ mode }),
  setDragging: (dragging) => set({ dragging }),
  setEraserMode: (mode) =>
    set({ eraserMode: mode, selectedId: null }),
  setTeleportMode: (mode) =>
    set({ teleportMode: mode, selectedId: null }),
  setPlaceDoorMode: (mode) =>
    set({ placeDoorMode: mode, selectedId: null }),
  setFreeCamActive: (v) => set({ freeCamActive: v }),
  setCullingDebug: (v) => set({ cullingDebug: v }),
  setCollisionManagerOpen: (v) => set({ collisionManagerOpen: v }),
  setPropViewerOpen: (v) => set({ propViewerOpen: v }),
  setPropViewerIndex: (v) => set({ propViewerIndex: v }),
  setViewDoorsMode: (mode) =>
    set({ viewDoorsMode: mode, ...(mode ? { cameraMode: 'free' } : {}) }),
  setDoorTransformMode: (mode) => set({ doorTransformMode: mode }),
  setDoorViewStyle: (style) => set({ doorViewStyle: style }),
  selectDoor: (id) => set({ selectedDoorId: id, doorTransformMode: null }),
  addDoor: (door) =>
    set((s) => {
      const next = [...s.placedDoors, door]
      persistDoors(next)
      return { placedDoors: next }
    }),
  removeDoor: (id) =>
    set((s) => {
      const next = s.placedDoors.filter((d) => d.id !== id)
      persistDoors(next)
      return { placedDoors: next }
    }),
  flipDoor: (id) =>
    set((s) => {
      const next = s.placedDoors.map((d) =>
        d.id === id ? { ...d, nx: -d.nx, nz: -d.nz } : d,
      )
      persistDoors(next)
      return { placedDoors: next }
    }),
  updateDoor: (id, partial) =>
    set((s) => {
      const next = s.placedDoors.map((d) => (d.id === id ? { ...d, ...partial } : d))
      persistDoors(next)
      return { placedDoors: next }
    }),
  rotateDoor: (id, delta) =>
    set((s) => {
      const next = s.placedDoors.map((d) => {
        if (d.id !== id) return d
        const angle = Math.atan2(d.nx, d.nz) + delta
        return {
          ...d,
          nx: parseFloat(Math.sin(angle).toFixed(3)),
          nz: parseFloat(Math.cos(angle).toFixed(3)),
        }
      })
      persistDoors(next)
      return { placedDoors: next }
    }),
  renameDoor: (id, name) =>
    set((s) => {
      const next = s.placedDoors.map((d) => (d.id === id ? { ...d, name } : d))
      persistDoors(next)
      return { placedDoors: next }
    }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  register: (obj) =>
    set((s) => ({
      objects: { ...s.objects, [obj.id]: obj },
    })),
  updatePosition: (id, pos) =>
    set((s) => {
      const dynIdx = s.dynamicObjects.findIndex((o) => o.id === id)
      if (dynIdx !== -1) {
        const updated = [...s.dynamicObjects]
        updated[dynIdx] = {
          ...updated[dynIdx],
          position: [pos.x, pos.y, pos.z],
        }
        return { dynamicObjects: updated }
      }
      if (!s.objects[id]) return {}
      return {
        objects: {
          ...s.objects,
          [id]: { ...s.objects[id], position: [pos.x, pos.y, pos.z] },
        },
      }
    }),
  updateRotation: (id, rot) =>
    set((s) => {
      const dynIdx = s.dynamicObjects.findIndex((o) => o.id === id)
      if (dynIdx !== -1) {
        const updated = [...s.dynamicObjects]
        updated[dynIdx] = { ...updated[dynIdx], rotation: rot }
        return { dynamicObjects: updated }
      }
      if (!s.objects[id]) return {}
      return {
        objects: {
          ...s.objects,
          [id]: { ...s.objects[id], rotation: rot },
        },
      }
    }),
  addObject: (obj) =>
    set((s) => ({ dynamicObjects: [...s.dynamicObjects, obj] })),
  removeObject: (id) =>
    set((s) => {
      // Dynamic object → remove from array
      if (s.dynamicObjects.some((o) => o.id === id)) {
        return {
          dynamicObjects: s.dynamicObjects.filter((o) => o.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }
      }
      // Static object → hide it
      if (s.objects[id]) {
        const next = new Set(s.hiddenIds)
        next.add(id)
        return { hiddenIds: next, selectedId: null }
      }
      return {}
    }),
  pushUndo: (entry) =>
    set((s) => ({ undoStack: [...s.undoStack.slice(-49), entry] })),
  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return {}
      const entry = s.undoStack[s.undoStack.length - 1]
      const rest = s.undoStack.slice(0, -1)

      // Also update the Object3D ref so the gizmo reflects the change
      const ref = editorRefs[entry.id]
      if (ref) {
        ref.position.set(...entry.position)
        ref.rotation.y = entry.rotation
      }

      // Update store state
      const dynIdx = s.dynamicObjects.findIndex((o) => o.id === entry.id)
      if (dynIdx !== -1) {
        const updated = [...s.dynamicObjects]
        updated[dynIdx] = {
          ...updated[dynIdx],
          position: entry.position,
          rotation: entry.rotation,
        }
        return { undoStack: rest, dynamicObjects: updated }
      }
      if (s.objects[entry.id]) {
        return {
          undoStack: rest,
          objects: {
            ...s.objects,
            [entry.id]: {
              ...s.objects[entry.id],
              position: entry.position,
              rotation: entry.rotation,
            },
          },
        }
      }
      return { undoStack: rest }
    }),
  hitboxVersion: 0,
  bumpHitboxVersion: () => set((s) => ({ hitboxVersion: s.hitboxVersion + 1 })),
}))
