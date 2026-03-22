import * as THREE from 'three'

/** Shared ref to the TestMap scene — used by Player for raycasting. */
export const testMapScene: { current: THREE.Object3D | null } = { current: null }
