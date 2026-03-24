export interface DoorTrigger {
  id: string
  name?: string
  x: number
  y?: number  // terrain height at placement — visual only, not used for trigger logic
  z: number
  radius: number
  /** Unit vector pointing INTO the building */
  nx: number
  nz: number
}

/** Hardcoded fallback — loaded once if localStorage is empty */
export const DOOR_TRIGGERS: DoorTrigger[] = [
  // { id: 'door_1234', x: 22.75, z: 19.10, radius: 1.5, nx: 0.00, nz: -1.00 },
]

const STORAGE_KEY = 'door-triggers'

export function loadSavedDoors(): DoorTrigger[] {
  if (typeof window === 'undefined') return [...DOOR_TRIGGERS]
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? (JSON.parse(s) as DoorTrigger[]) : [...DOOR_TRIGGERS]
  } catch {
    return [...DOOR_TRIGGERS]
  }
}

export function persistDoors(doors: DoorTrigger[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doors))
  }
}

export function exportDoorsToClipboard(doors: DoorTrigger[]) {
  const lines = doors
    .map(
      (d) =>
        `  { id: '${d.id}', x: ${d.x.toFixed(2)}, z: ${d.z.toFixed(2)}, radius: ${d.radius}, nx: ${d.nx}, nz: ${d.nz} },`,
    )
    .join('\n')
  navigator.clipboard.writeText(`export const DOOR_TRIGGERS: DoorTrigger[] = [\n${lines}\n]`)
}
