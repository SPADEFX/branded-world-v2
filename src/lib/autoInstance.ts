import * as THREE from 'three'

const THRESHOLD = 3

/**
 * Groups meshes in the scene by geometry+material, creates InstancedMesh for
 * groups with >= THRESHOLD members, removes the originals.
 * Returns the meshes that were NOT instanced (singletons / unique meshes).
 */
export function autoInstance(scene: THREE.Object3D): THREE.Mesh[] {
  const all: THREE.Mesh[] = []
  scene.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) all.push(c as THREE.Mesh)
  })

  // Group by geometry + material (skip multi-material meshes)
  const groups = new Map<string, THREE.Mesh[]>()
  for (const m of all) {
    if (Array.isArray(m.material)) continue
    const key = m.geometry.uuid + '_' + (m.material as THREE.Material).uuid
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  const remaining: THREE.Mesh[] = []
  for (const [, group] of groups) {
    if (group.length < THRESHOLD) {
      remaining.push(...group)
      continue
    }

    const first = group[0]
    // Force DoubleSide so mirrored instances (negative scale) don't have
    // invisible back-faces due to winding flip. Modify in-place to avoid
    // breaking custom shader cache keys (e.g. cliffMaterial).
    const mat = first.material as THREE.Material
    if (mat.side !== THREE.DoubleSide) {
      mat.side = THREE.DoubleSide
      mat.needsUpdate = true
    }
    const inst = new THREE.InstancedMesh(first.geometry, mat, group.length)
    inst.castShadow = first.castShadow
    inst.receiveShadow = first.receiveShadow
    inst.frustumCulled = true

    for (let i = 0; i < group.length; i++) {
      group[i].updateWorldMatrix(true, false)
      inst.setMatrixAt(i, group[i].matrixWorld)
      group[i].parent?.remove(group[i])
    }
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
    scene.add(inst)
  }

  return remaining
}
