import { create } from 'zustand'

const STORAGE_KEY = 'detailmisc-collision-v1'

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function save(names: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...names]))
}

interface CollisionState {
  enabledNames: Set<string>
  version: number
  toggle: (name: string) => void
  enableAll: () => void
  disableAll: () => void
}

export const useCollisionStore = create<CollisionState>((set, get) => ({
  enabledNames: load(),
  version: 0,
  toggle: (name) =>
    set((s) => {
      const next = new Set(s.enabledNames)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      save(next)
      return { enabledNames: next, version: s.version + 1 }
    }),
  enableAll: () =>
    set(() => {
      // populated externally — can't import propRegistry here, caller passes names
      return {}
    }),
  disableAll: () =>
    set(() => {
      save(new Set())
      return { enabledNames: new Set(), version: get().version + 1 }
    }),
}))
