'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import { testMapScene, visualMeshes, fadeScenesRef, buildingScenesRef, setDressMeshes, detailMiscMeshes, propRegistry, type PropInfo } from '@/lib/testMapRef'
import { cliffMaterial, isCliff } from '@/lib/cliffMaterial'
import { autoInstance, mergeByMaterial } from '@/lib/autoInstance'
import { waterfallStreamMaterial, waterfallPoolMaterial, waterfallUniforms } from '@/lib/waterfallMaterial'
import { waterMaterial, waterUniforms } from '@/lib/waterMaterial'
import { useCollisionStore } from '@/stores/collisionStore'
import { registerHitbox, unregisterHitbox } from '@/lib/hitboxes'

// Patch Three.js once so all Mesh/InstancedMesh raycasts use BVH acceleration
;(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree
;(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree
;(THREE.Mesh.prototype as any).raycast = acceleratedRaycast

function buildBVH(scene: THREE.Object3D) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry as THREE.BufferGeometry & { boundsTree?: unknown }
    if (!geo.boundsTree) geo.computeBoundsTree()
  })
}

const COLLISION_PATTERNS = [
  'SM_Env_Rock', 'SM_Env_Ground', 'SM_Env_Path', 'SM_Env_Cliff',
  'SM_Env_Stairs', 'SM_Env_Floor', 'SM_Env_Terrain', 'SM_Env_Footpath',
  'SM_Env_Bridge', 'SM_Bld_Floor',
]

function isCollisionMesh(name: string) {
  return COLLISION_PATTERNS.some((p) => name.includes(p))
}

function isWaterPlane(name: string) {
  const n = name.toLowerCase()
  return (n.includes('water_plane') || n.includes('water_dip')) && !n.includes('waterfall')
}

export function Environment() {
  const { scene: terrain } = useGLTF('/models/terrain.glb')
  const { scene: env } = useGLTF('/models/environment.glb')
  const { scene: buildings } = useGLTF('/models/buildings.glb')
  const { scene: misc } = useGLTF('/models/Globalmisc.glb')
  const { scene: setdress } = useGLTF('/models/setdress.glb')
  const { scene: detailmisc } = useGLTF('/models/detailmisc.glb')

  const collisionVersion = useCollisionStore((s) => s.version)
  const detailCollisionIds = useRef<string[]>([])

  useFrame((_, delta) => {
    waterfallUniforms.uTime.value += delta
    waterUniforms.uTime.value += delta
  })

  useEffect(() => {
    // Collect water plane geometry UUIDs BEFORE autoInstance so we can find
    // the resulting InstancedMesh afterwards and apply the water material to it
    const waterGeoUuids = new Set<string>()

    // Apply materials to env
    env.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh

      // Waterfall stream — world-space Y scroll
      if (mesh.name.toLowerCase().includes('fx_waterfall')) {
        mesh.material = waterfallStreamMaterial
        mesh.castShadow = false
        mesh.receiveShadow = false
        return
      }
      // Waterfall pool/splash plane
      if (mesh.name.toLowerCase().includes('water_plane_waterfall')) {
        mesh.material = waterfallPoolMaterial
        mesh.castShadow = false
        mesh.receiveShadow = false
        return
      }
      // Main water surface — collect geo UUIDs, let autoInstance group them,
      // then apply waterMaterial to the resulting InstancedMesh below
      if (isWaterPlane(mesh.name)) {
        waterGeoUuids.add(mesh.geometry.uuid)
        mesh.castShadow = false
        mesh.receiveShadow = false
        return
      }

      mesh.receiveShadow = true
      const isGround = (
        mesh.name.includes('SM_Env_Ground') ||
        mesh.name.includes('SM_Env_Terrain') ||
        mesh.name.includes('SM_Env_Path') ||
        mesh.name.includes('SM_Env_Floor') ||
        mesh.name.includes('SM_Env_Footpath') ||
        mesh.name.includes('SM_Bld_Floor')
      )
      mesh.castShadow = !isGround
      if (isCliff(mesh.name)) {
        mesh.material = cliffMaterial
        return
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
      }
    })

    // Apply materials to terrain
    terrain.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.receiveShadow = false
      mesh.castShadow = false
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 1
      }
    })

    const remaining = autoInstance(env)

    // After instancing, find the InstancedMesh(es) that were created from
    // water plane geometry and apply waterMaterial
    env.traverse((child) => {
      const inst = child as THREE.InstancedMesh
      if (!inst.isInstancedMesh) return
      if (waterGeoUuids.has(inst.geometry.uuid)) {
        inst.material = waterMaterial
        inst.castShadow = false
        inst.receiveShadow = false
      }
    })

    // Apply water material to any singleton water meshes that weren't instanced
    // (unique geometry) and keep them out of visualMeshes so they aren't distance-culled
    for (const mesh of remaining) {
      if (isWaterPlane(mesh.name)) {
        mesh.material = waterMaterial
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    }

    buildBVH(env)
    testMapScene.current = [env]
    fadeScenesRef.current = [env]
    visualMeshes.current = remaining.filter((m) => !isCollisionMesh(m.name) && !isWaterPlane(m.name))

    return () => {
      testMapScene.current = []
      fadeScenesRef.current = []
      visualMeshes.current = []
    }
  }, [env, terrain])

  useEffect(() => {
    buildings.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (isCliff(mesh.name)) { mesh.material = cliffMaterial; return }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
        m.emissiveIntensity = 0
      }
    })
    autoInstance(buildings)
    buildBVH(buildings)

    testMapScene.current = [...testMapScene.current.filter((s) => s !== buildings), buildings]
    buildingScenesRef.current = [buildings]

    return () => {
      testMapScene.current = testMapScene.current.filter((s) => s !== buildings)
      buildingScenesRef.current = []
    }
  }, [buildings])

  useEffect(() => {
    const meshes: THREE.Mesh[] = []
    setdress.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.castShadow = false
      mesh.receiveShadow = true
      mesh.visible = false
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
        m.emissiveIntensity = 0
      }
      meshes.push(mesh)
    })
    buildBVH(setdress)
    setDressMeshes.current = meshes
    testMapScene.current = [...testMapScene.current.filter((s) => s !== setdress), setdress]

    // Populate propRegistry.setdress — deduplicate by baseName
    const seenSd = new Set<string>()
    const sdProps: PropInfo[] = []
    for (const mesh of meshes) {
      const baseName = mesh.name.replace(/\.\d+$/, '')
      if (seenSd.has(baseName)) continue
      seenSd.add(baseName)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      const bb = mesh.geometry.boundingBox
      const h = bb ? (bb.max.y - bb.min.y) * Math.abs(mesh.scale.y) : 1
      const instanceCount = meshes.filter((m) => m.name.replace(/\.\d+$/, '') === baseName).length
      sdProps.push({ baseName, mesh, sceneMesh: mesh, height: h, glbFile: 'setdress.glb', instanceCount })
    }
    propRegistry.setdress = sdProps.sort((a, b) => a.baseName.localeCompare(b.baseName))
    const { hiddenNames: hiddenSd } = useCollisionStore.getState()
    for (const p of propRegistry.setdress) {
      if (hiddenSd.has(p.baseName)) p.sceneMesh.visible = false
    }

    return () => {
      setDressMeshes.current = []
      testMapScene.current = testMapScene.current.filter((s) => s !== setdress)
      propRegistry.setdress = []
    }
  }, [setdress])

  useEffect(() => {
    detailmisc.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.castShadow = false
      mesh.receiveShadow = false
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
        m.emissiveIntensity = 0
      }
    })
    const remaining = autoInstance(detailmisc)
    detailMiscMeshes.current = remaining

    // Capture unique mesh info AFTER autoInstance — use InstancedMesh geometry+material
    // (guaranteed valid, actively used by the renderer) to generate thumbnails
    const seen = new Set<string>()
    const props: PropInfo[] = []

    detailmisc.traverse((child) => {
      const inst = child as THREE.InstancedMesh
      if (!inst.isInstancedMesh) return
      const baseName = inst.name.replace(/\.\d+$/, '')
      if (seen.has(baseName)) return
      seen.add(baseName)
      const mat = Array.isArray(inst.material) ? inst.material[0] : inst.material
      const proxy = new THREE.Mesh(inst.geometry, mat)
      if (!inst.geometry.boundingBox) inst.geometry.computeBoundingBox()
      const bb = inst.geometry.boundingBox
      props.push({
        baseName, mesh: proxy, sceneMesh: inst,
        height: bb ? bb.max.y - bb.min.y : 1,
        glbFile: 'detailmisc.glb', instanceCount: inst.count,
      })
    })

    for (const mesh of remaining) {
      const baseName = mesh.name.replace(/\.\d+$/, '')
      if (seen.has(baseName)) continue
      seen.add(baseName)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      const bb = mesh.geometry.boundingBox
      const h = bb ? (bb.max.y - bb.min.y) * Math.abs(mesh.scale.y) : 1
      props.push({
        baseName, mesh, sceneMesh: mesh,
        height: h, glbFile: 'detailmisc.glb', instanceCount: 1,
      })
    }

    propRegistry.detailmisc = props.sort((a, b) => a.baseName.localeCompare(b.baseName))
    const { hiddenNames: hiddenDm } = useCollisionStore.getState()
    for (const p of propRegistry.detailmisc) {
      if (hiddenDm.has(p.baseName)) p.sceneMesh.visible = false
    }

    return () => {
      detailMiscMeshes.current = []
      propRegistry.detailmisc = []
    }
  }, [detailmisc])

  // Rebuild AABB hitboxes for detailmisc whenever collision config changes
  useEffect(() => {
    const { enabledNames } = useCollisionStore.getState()

    // Clear previous hitboxes
    detailCollisionIds.current.forEach((id) => unregisterHitbox(id))
    detailCollisionIds.current = []

    if (enabledNames.size === 0) return

    const _instanceMat = new THREE.Matrix4()
    const ids: string[] = []

    // InstancedMeshes (groups of 2+ identical meshes after autoInstance)
    detailmisc.traverse((child) => {
      const inst = child as THREE.InstancedMesh
      if (!inst.isInstancedMesh) return
      const baseName = inst.name.replace(/\.\d+$/, '')
      if (!enabledNames.has(baseName)) return

      inst.updateWorldMatrix(true, false)
      const geo = inst.geometry
      if (!geo.boundingBox) geo.computeBoundingBox()
      const localBB = geo.boundingBox!

      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, _instanceMat)
        const worldMat = new THREE.Matrix4().multiplyMatrices(inst.matrixWorld, _instanceMat)
        const wb = localBB.clone().applyMatrix4(worldMat)
        const cx = (wb.min.x + wb.max.x) / 2
        const cz = (wb.min.z + wb.max.z) / 2
        const hw = (wb.max.x - wb.min.x) / 2
        const hd = (wb.max.z - wb.min.z) / 2
        const id = `dc_${baseName}_${i}`.replace(/[^a-zA-Z0-9_]/g, '_')
        registerHitbox(id, cx, cz, hw, hd, wb.max.y)
        ids.push(id)
      }
    })

    // Singletons (unique meshes not grouped by autoInstance)
    for (const mesh of detailMiscMeshes.current) {
      const baseName = mesh.name.replace(/\.\d+$/, '')
      if (!enabledNames.has(baseName)) continue
      mesh.updateWorldMatrix(true, false)
      const geo = mesh.geometry
      if (!geo.boundingBox) geo.computeBoundingBox()
      const wb = geo.boundingBox!.clone().applyMatrix4(mesh.matrixWorld)
      const cx = (wb.min.x + wb.max.x) / 2
      const cz = (wb.min.z + wb.max.z) / 2
      const id = `dc_${mesh.name}`.replace(/[^a-zA-Z0-9_]/g, '_')
      registerHitbox(id, cx, cz, (wb.max.x - wb.min.x) / 2, (wb.max.z - wb.min.z) / 2, wb.max.y)
      ids.push(id)
    }

    detailCollisionIds.current = ids

    return () => {
      ids.forEach((id) => unregisterHitbox(id))
      detailCollisionIds.current = []
    }
  }, [detailmisc, collisionVersion])

  useEffect(() => {
    misc.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (isCliff(mesh.name)) { mesh.material = cliffMaterial; return }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
        m.emissiveIntensity = 0
      }
    })
    const remaining = autoInstance(misc)
    buildBVH(misc)
    testMapScene.current = [...testMapScene.current.filter((s) => s !== misc), misc]

    // Populate propRegistry.misc after autoInstance
    const seen = new Set<string>()
    const props: PropInfo[] = []
    misc.traverse((child) => {
      const inst = child as THREE.InstancedMesh
      if (!inst.isInstancedMesh) return
      const baseName = inst.name.replace(/\.\d+$/, '')
      if (seen.has(baseName)) return
      seen.add(baseName)
      const mat = Array.isArray(inst.material) ? inst.material[0] : inst.material
      const proxy = new THREE.Mesh(inst.geometry, mat)
      if (!inst.geometry.boundingBox) inst.geometry.computeBoundingBox()
      const bb = inst.geometry.boundingBox
      props.push({ baseName, mesh: proxy, sceneMesh: inst, height: bb ? bb.max.y - bb.min.y : 1, glbFile: 'Globalmisc.glb', instanceCount: inst.count })
    })
    for (const mesh of remaining) {
      const baseName = mesh.name.replace(/\.\d+$/, '')
      if (seen.has(baseName)) continue
      seen.add(baseName)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      const bb = mesh.geometry.boundingBox
      props.push({ baseName, mesh, sceneMesh: mesh, height: bb ? (bb.max.y - bb.min.y) * Math.abs(mesh.scale.y) : 1, glbFile: 'Globalmisc.glb', instanceCount: 1 })
    }
    propRegistry.misc = props.sort((a, b) => a.baseName.localeCompare(b.baseName))
    const { hiddenNames: hiddenMisc } = useCollisionStore.getState()
    for (const p of propRegistry.misc) {
      if (hiddenMisc.has(p.baseName)) p.sceneMesh.visible = false
    }

    return () => {
      testMapScene.current = testMapScene.current.filter((s) => s !== misc)
      propRegistry.misc = []
    }
  }, [misc])

  return (
    <>
      <primitive object={terrain} />
      <primitive object={env} />
      <primitive object={buildings} />
      <primitive object={misc} />
      <primitive object={setdress} />
      <primitive object={detailmisc} />
    </>
  )
}

useGLTF.preload('/models/terrain.glb')
useGLTF.preload('/models/environment.glb')
useGLTF.preload('/models/buildings.glb')
useGLTF.preload('/models/Globalmisc.glb')
useGLTF.preload('/models/setdress.glb')
useGLTF.preload('/models/detailmisc.glb')
