'use client'

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import { testMapScene, visualMeshes, fadeScenesRef } from '@/lib/testMapRef'
import { cliffMaterial, isCliff } from '@/lib/cliffMaterial'
import { autoInstance, mergeByMaterial } from '@/lib/autoInstance'
import { waterfallStreamMaterial, waterfallPoolMaterial, waterfallUniforms } from '@/lib/waterfallMaterial'
import { waterMaterial, waterUniforms } from '@/lib/waterMaterial'

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

    return () => {
      testMapScene.current = testMapScene.current.filter((s) => s !== buildings)
    }
  }, [buildings])

  return (
    <>
      <primitive object={terrain} />
      <primitive object={env} />
      <primitive object={buildings} />
    </>
  )
}

useGLTF.preload('/models/terrain.glb')
useGLTF.preload('/models/environment.glb')
useGLTF.preload('/models/buildings.glb')
