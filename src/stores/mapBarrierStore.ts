import { create } from 'zustand'

export interface BarrierPoint {
  x: number
  z: number
}

export interface BarrierWall {
  id: string
  points: BarrierPoint[]
  width: number
  minY: number
  maxY: number
}

const STORAGE_KEY = 'map-barriers'

function loadFromStorage(): BarrierWall[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const walls = JSON.parse(raw) as BarrierWall[]
    // Migrate old walls that don't have per-wall minY/maxY
    return walls.map((w) => ({ minY: -1, maxY: 8, ...w }))
  } catch {
    return []
  }
}

function saveToStorage(walls: BarrierWall[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(walls))
  } catch {
    // ignore
  }
}

interface MapBarrierState {
  walls: BarrierWall[]
  active: boolean
  isAddingWall: boolean
  drawingPoints: BarrierPoint[]
  selectedWallId: string | null
  minY: number
  maxY: number
  width: number

  setActive: (v: boolean) => void
  startNewWall: () => void
  addPoint: (x: number, z: number) => void
  finishWall: () => void
  removeLastPoint: () => void
  cancelDrawing: () => void
  selectWall: (id: string | null) => void
  deleteWall: (id: string) => void
  continueWall: (wallId: string, reverse?: boolean) => void
  updateWallWidth: (id: string, width: number) => void
  updateWallBounds: (id: string, minY: number, maxY: number) => void
  updatePoint: (wallId: string, pointIndex: number, x: number, z: number) => void
  setMinY: (v: number) => void
  setMaxY: (v: number) => void
  setWidth: (v: number) => void
}

export const useMapBarrierStore = create<MapBarrierState>((set, get) => ({
  walls: loadFromStorage(),
  active: false,
  isAddingWall: false,
  drawingPoints: [],
  selectedWallId: null,
  minY: -1,
  maxY: 8,
  width: 0.5,

  setActive: (v) => set({ active: v }),

  startNewWall: () => set({ isAddingWall: true, drawingPoints: [] }),

  addPoint: (x, z) =>
    set((s) => ({ drawingPoints: [...s.drawingPoints, { x, z }] })),

  finishWall: () => {
    const { drawingPoints, walls } = get()
    if (drawingPoints.length < 2) {
      set({ drawingPoints: [] })
      return
    }
    const { minY, maxY } = get()
    const newWall: BarrierWall = {
      id: `barrier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      points: [...drawingPoints],
      width: 0.5,
      minY,
      maxY,
    }
    const next = [...walls, newWall]
    saveToStorage(next)
    set({ walls: next, drawingPoints: [], isAddingWall: false })
  },

  cancelDrawing: () => set({ drawingPoints: [], isAddingWall: false }),

  removeLastPoint: () => set((s) => ({ drawingPoints: s.drawingPoints.slice(0, -1) })),

  selectWall: (id) => set({ selectedWallId: id }),

  deleteWall: (id) => {
    const next = get().walls.filter((w) => w.id !== id)
    saveToStorage(next)
    set({ walls: next, selectedWallId: get().selectedWallId === id ? null : get().selectedWallId })
  },

  continueWall: (wallId, reverse = false) => {
    const wall = get().walls.find((w) => w.id === wallId)
    if (!wall) return
    const next = get().walls.filter((w) => w.id !== wallId)
    saveToStorage(next)
    const points = reverse ? [...wall.points].reverse() : [...wall.points]
    set({ walls: next, drawingPoints: points, isAddingWall: true })
  },

  updateWallWidth: (id, width) => {
    const next = get().walls.map((w) => (w.id === id ? { ...w, width } : w))
    saveToStorage(next)
    set({ walls: next })
  },

  updateWallBounds: (id, minY, maxY) => {
    const next = get().walls.map((w) => (w.id === id ? { ...w, minY, maxY } : w))
    saveToStorage(next)
    set({ walls: next })
  },

  updatePoint: (wallId, pointIndex, x, z) => {
    const next = get().walls.map((w) => {
      if (w.id !== wallId) return w
      const points = [...w.points]
      points[pointIndex] = { x, z }
      return { ...w, points }
    })
    saveToStorage(next)
    set({ walls: next })
  },

  setMinY: (v) => set({ minY: v }),
  setMaxY: (v) => set({ maxY: v }),
  setWidth: (v) => set({ width: v }),
}))

// If localStorage is empty on first load, hydrate from the project file
if (typeof window !== 'undefined' && loadFromStorage().length === 0) {
  fetch('/api/barriers')
    .then((r) => r.json())
    .then((walls: BarrierWall[]) => {
      if (walls.length > 0) {
        saveToStorage(walls)
        useMapBarrierStore.setState({ walls })
      }
    })
    .catch(() => {})
}
