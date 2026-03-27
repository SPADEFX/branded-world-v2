import { create } from 'zustand'

interface MinimapState {
  discoveredZones: string[]
  /** Zone label shown in the toast; null when no pending notification */
  pendingNotification: string | null
  discoverZone: (id: string, label: string) => void
  clearNotification: () => void
  /** Dev helper — reset all discovery (call from console) */
  resetDiscovery: () => void
}

const STORAGE_KEY = 'bw_minimap_discovered'

function loadDiscovered(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export const useMinimapStore = create<MinimapState>((set, get) => ({
  discoveredZones: loadDiscovered(),
  pendingNotification: null,

  discoverZone: (id, label) => {
    if (get().discoveredZones.includes(id)) return
    const next = [...get().discoveredZones, id]
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
    set({ discoveredZones: next, pendingNotification: label })
  },

  clearNotification: () => set({ pendingNotification: null }),

  resetDiscovery: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    set({ discoveredZones: [], pendingNotification: null })
  },
}))
