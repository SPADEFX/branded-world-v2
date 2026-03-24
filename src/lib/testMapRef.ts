import * as THREE from 'three'

/** Shared ref to the collision scenes — used by Player/NPCs for raycasting. */
export const testMapScene: { current: THREE.Object3D[] } = { current: [] }

/** Pre-cached list of non-instanced visual meshes — used by DistanceCuller. */
export const visualMeshes: { current: THREE.Mesh[] } = { current: [] }

/** Scenes used for camera obstruction fade — env only, NOT buildings (avoids transparent interiors). */
export const fadeScenesRef: { current: THREE.Object3D[] } = { current: [] }

