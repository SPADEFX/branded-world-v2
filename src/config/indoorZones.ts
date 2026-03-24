export interface DoorTrigger {
  id: string
  x: number
  z: number
  radius: number
  /** Unit vector pointing INTO the building — set when placing by facing inward */
  nx: number
  nz: number
}

/**
 * Door triggers for indoor/outdoor camera state.
 *
 * HOW TO PLACE A DOOR:
 *   1. Editor ON → walk to the doorway
 *   2. Face INTO the building (player looks inward)
 *   3. Click "Add Door Here" → line is copied to clipboard
 *   4. Paste it here in the DOOR_TRIGGERS array
 *
 * The trigger uses dot-product detection — no toggle, no desync.
 * Grazing and turning back leaves state unchanged.
 */
export const DOOR_TRIGGERS: DoorTrigger[] = [
  // { id: 'door_1234', x: 22.75, z: 19.10, radius: 1.5, nx: 0.00, nz: -1.00 },
]
