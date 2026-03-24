import * as THREE from 'three'

/** Shared ref to the collision scenes — used by Player/NPCs for raycasting. */
export const testMapScene: { current: THREE.Object3D[] } = { current: [] }

/** Unique mesh info captured after autoInstance — used by PropViewer. */
export interface PropInfo {
  baseName: string
  mesh: THREE.Mesh                              // proxy mesh for thumbnail rendering
  sceneMesh: THREE.InstancedMesh | THREE.Mesh  // actual object in the scene (for highlight)
  height: number                                // world-space bounding box height
  glbFile: string
  instanceCount: number
}

export const propRegistry: { detailmisc: PropInfo[] } = {
  detailmisc: [],
}

/** Pre-cached list of non-instanced visual meshes — used by DistanceCuller. */
export const visualMeshes: { current: THREE.Mesh[] } = { current: [] }

/** Scenes used for camera obstruction fade — env only, NOT buildings (avoids transparent interiors). */
export const fadeScenesRef: { current: THREE.Object3D[] } = { current: [] }

/** Buildings scene only — used for door placement wall detection. */
export const buildingScenesRef: { current: THREE.Object3D[] } = { current: [] }

/** SetDress meshes — culled at tight distance (15u) for performance. */
export const setDressMeshes: { current: THREE.Mesh[] } = { current: [] }

/** DetailMisc singleton meshes — culled at medium distance (30u) for performance. */
export const detailMiscMeshes: { current: THREE.Mesh[] } = { current: [] }

