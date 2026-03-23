import * as THREE from 'three'

/** Shared ref to the collision scenes — used by Player/NPCs for raycasting. */
export const testMapScene: { current: THREE.Object3D[] } = { current: [] }

/** Pre-cached list of non-instanced visual meshes — used by DistanceCuller. */
export const visualMeshes: { current: THREE.Mesh[] } = { current: [] }
