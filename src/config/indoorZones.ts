export interface DoorTrigger {
  id: string
  x: number
  z: number
  radius: number
}

/**
 * Door triggers — walking into the radius toggles indoor/outdoor state.
 * Same trigger is used for entry AND exit (boolean toggle).
 *
 * To add a door:
 *   1. Enable Editor → click "Add Door" button
 *   2. Walk your player to the doorway
 *   3. The coords are printed to console — copy them here
 */
export const DOOR_TRIGGERS: DoorTrigger[] = [
  // Example (replace with real coords):
  // { id: 'castle_main_door', x: 12.5, z: -8.3, radius: 1.5 },
]
