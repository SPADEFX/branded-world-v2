/** Mutable player state — written by Player, read by InteractionZones & CameraRig each frame. */
export const playerPosition = { x: 0, y: 0, z: 20 }
export const playerRotation = { y: 0 }
export const cameraInput = { x: 0 }

/** Mutable NPC positions — written by each NPC, read by InteractionZones & CameraRig. */
export const npcPositions: Record<string, { x: number; z: number }> = {}

/** Set by TeleportGhost on click — consumed by Player.tsx on the next frame. */
export const teleportTarget: { current: { x: number; y: number; z: number } | null } = { current: null }

/** Toggled by DoorTriggers when player crosses a door — read by CameraRig. */
export const isIndoorsRef: { current: boolean } = { current: false }

/** Set by door list / 3D disc click — consumed by EditorCamera FreeOrbitView. */
export const freeCameraJumpTarget: { current: { x: number; y: number; z: number } | null } = { current: null }
