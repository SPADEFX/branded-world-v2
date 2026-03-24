import * as THREE from 'three'

/** Shared ref to the collision scenes — used by Player/NPCs for raycasting. */
export const testMapScene: { current: THREE.Object3D[] } = { current: [] }

/** Pre-cached list of non-instanced visual meshes — used by DistanceCuller. */
export const visualMeshes: { current: THREE.Mesh[] } = { current: [] }

/** Scenes used for camera obstruction fade — env only, NOT buildings (avoids transparent interiors). */
export const fadeScenesRef: { current: THREE.Object3D[] } = { current: [] }

/** Buildings scene only — used by CameraRig for indoor wall fade. */
export const buildingScenesRef: { current: THREE.Object3D[] } = { current: [] }

/** Clipping plane applied to all building materials — cuts roof when player is indoors. */
export const buildingClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9)
