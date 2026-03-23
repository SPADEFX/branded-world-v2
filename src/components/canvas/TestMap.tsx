'use client'

import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { testMapScene } from '@/lib/testMapRef'
import { cliffMaterial, isCliff } from '@/lib/cliffMaterial'

export function TestMap() {
  const { scene } = useGLTF('/models/untitled.glb')

  useEffect(() => {
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh

      mesh.receiveShadow = true
      // Seulement les gros éléments structurels castent des ombres
      const n = mesh.name
      mesh.castShadow = (
        n.includes('SM_Env_Rock_Cliff') ||
        n.includes('SM_Env_Mountains') ||
        n.includes('SM_Bld_') ||
        n.includes('SM_Env_Ground') ||
        n.includes('SM_Env_Terrain') ||
        n.includes('SM_Env_Rock_Bridge') ||
        n.includes('SM_Env_Rock_Stairs')
      )

      if (isCliff(mesh.name)) {
        mesh.material = cliffMaterial
      } else {
        // Fix metalness
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          const m = mat as THREE.MeshStandardMaterial
          if (!m.isMeshStandardMaterial) continue
          m.metalness = 0
          m.roughness = 0.9
        }
      }


    })

    testMapScene.current = scene
    return () => { testMapScene.current = null }
  }, [scene])

  return <primitive object={scene} position={[0, 0, 0]} />
}

useGLTF.preload('/models/untitled.glb')
