import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const THRESHOLD = 2

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

  // Compute scene's inverse world matrix so instance matrices are expressed
  // relative to the scene root — avoids double-applying any root transform.
  scene.updateWorldMatrix(true, false)
  const sceneInv = new THREE.Matrix4().copy(scene.matrixWorld).invert()
  const relMatrix = new THREE.Matrix4()
  const _pos = new THREE.Vector3()

  let instanced = 0, singletons = 0
  const remaining: THREE.Mesh[] = []
  for (const [, group] of groups) {
    // Filter out unplaced template meshes sitting at the world origin
    const placed = group.filter((m) => {
      m.updateWorldMatrix(true, false)
      m.matrixWorld.decompose(_pos, new THREE.Quaternion(), new THREE.Vector3())
      return _pos.lengthSq() > 0.0001
    })

    if (placed.length < THRESHOLD) {
      remaining.push(...placed)
      singletons += placed.length
      continue
    }
    instanced += placed.length

    const first = placed[0]
    // Force DoubleSide so mirrored instances (negative scale) don't have
    // invisible back-faces due to winding flip. Modify in-place to avoid
    // breaking custom shader cache keys (e.g. cliffMaterial).
    const mat = first.material as THREE.Material
    if (mat.side !== THREE.DoubleSide) {
      mat.side = THREE.DoubleSide
      mat.needsUpdate = true
    }
    const inst = new THREE.InstancedMesh(first.geometry, mat, placed.length)
    inst.name = first.name  // preserve for collision lookups
    inst.castShadow = first.castShadow
    inst.receiveShadow = first.receiveShadow
    inst.frustumCulled = true

    for (let i = 0; i < placed.length; i++) {
      placed[i].updateWorldMatrix(true, false)
      relMatrix.multiplyMatrices(sceneInv, placed[i].matrixWorld)
      inst.setMatrixAt(i, relMatrix)
      placed[i].parent?.remove(placed[i])
    }
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
    scene.add(inst)
  }

  console.log(`[autoInstance] instanced=${instanced} singletons=${singletons} groups=${groups.size}`)
  return remaining
}

/**
 * Merges singleton meshes that share the same material into one mesh each.
 * Run after autoInstance on the returned singletons to further reduce draw calls.
 */
export function mergeByMaterial(scene: THREE.Object3D, meshes: THREE.Mesh[]): void {
  const groups = new Map<string, THREE.Mesh[]>()
  for (const m of meshes) {
    if (Array.isArray(m.material)) continue
    const key = (m.material as THREE.Material).uuid
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  // Compute scene's world matrix so we can express child transforms relative to it
  scene.updateWorldMatrix(true, true)
  const sceneInverse = new THREE.Matrix4().copy(scene.matrixWorld).invert()

  const attrKey = (geo: THREE.BufferGeometry) =>
    Object.keys(geo.attributes).sort().join(',')

  let mergedCount = 0, groupCount = 0
  for (const [, group] of groups) {
    if (group.length < 2) continue

    // Filter to meshes whose attributes are compatible with the first one
    const key = attrKey(group[0].geometry)
    const compatible = group.filter((m) => attrKey(m.geometry) === key)
    if (compatible.length < 2) continue

    const geos = compatible.map((m) => {
      m.updateWorldMatrix(true, false)
      const rel = new THREE.Matrix4().multiplyMatrices(sceneInverse, m.matrixWorld)
      const g = m.geometry.clone()
      g.applyMatrix4(rel)
      return g
    })

    const merged = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!merged) continue

    const mesh = new THREE.Mesh(merged, compatible[0].material)
    mesh.castShadow = compatible[0].castShadow
    mesh.receiveShadow = compatible[0].receiveShadow
    scene.add(mesh)
    for (const m of compatible) m.parent?.remove(m)
    mergedCount += compatible.length
    groupCount++
  }
  console.log(`[mergeByMaterial] merged ${mergedCount} meshes into ${groupCount}`)
}
