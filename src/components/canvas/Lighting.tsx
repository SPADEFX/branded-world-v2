'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function Lighting() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#dbeafe', 0.008)
    scene.background = new THREE.Color('#dbeafe')
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.5} color="#f0f9ff" />

      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        color="#fff7ed"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
      />

      <hemisphereLight args={['#87ceeb', '#86efac', 0.35]} />
    </>
  )
}
