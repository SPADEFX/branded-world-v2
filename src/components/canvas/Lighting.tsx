'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphicsStore } from '@/stores/graphicsStore'

export function Lighting() {
  const { scene } = useThree()
  const lightRef = useRef<THREE.DirectionalLight>(null!)
  const { fogEnabled, fogDensity, ambientIntensity, directionalIntensity, shadows, shadowMapSize, shadowIntensity } = useGraphicsStore()

  useEffect(() => {
    scene.background = new THREE.Color('#b8cce0')
    if (fogEnabled) {
      scene.fog = new THREE.FogExp2('#b8cce0', fogDensity)
    } else {
      scene.fog = null
    }
  }, [scene, fogEnabled, fogDensity])

  // Dispose shadow map when size changes so Three.js recreates it at the new resolution
  useEffect(() => {
    const light = lightRef.current
    if (!light) return
    if (light.shadow.map) {
      light.shadow.map.dispose()
      light.shadow.map = null as any
    }
  }, [shadowMapSize])

  return (
    <>
      <ambientLight intensity={ambientIntensity} color="#ffffff" />

      <directionalLight
        ref={lightRef}
        position={[-30, 120, -120]}
        intensity={directionalIntensity}
        color="#fffdf5"
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
        shadow-intensity={shadowIntensity}
      />
    </>
  )
}
