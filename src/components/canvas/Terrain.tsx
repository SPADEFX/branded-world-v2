'use client'

import { useGLTF } from '@react-three/drei'

export function Terrain() {
  const { scene } = useGLTF('/models/terrain.glb')
  return <primitive object={scene} position={[0, 0, 0]} />
}

useGLTF.preload('/models/terrain.glb')
