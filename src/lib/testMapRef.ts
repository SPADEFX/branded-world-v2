import * as THREE from 'three'

/** Shared ref to the TestMap scene — used by Player for raycasting. */
export const testMapScene: { current: THREE.Object3D | null } = { current: null }

/** Pre-cached list of non-instanced visual meshes — used by DistanceCuller. */
export const visualMeshes: { current: THREE.Mesh[] } = { current: [] }
