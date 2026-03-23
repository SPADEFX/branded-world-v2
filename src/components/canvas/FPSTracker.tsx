'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphicsStore } from '@/stores/graphicsStore'

export function FPSTracker() {
  const frameCount = useRef(0)
  const elapsed = useRef(0)

  useFrame(({ scene }, delta) => {
    frameCount.current++
    elapsed.current += delta

    if (elapsed.current < 0.5) return

    const fps = Math.round(frameCount.current / elapsed.current)

    // Count draw calls from scene (works with both WebGL and WebGPU renderers)
    let drawCalls = 0
    scene.traverse((obj) => {
      if (!obj.visible) return
      if ((obj as THREE.InstancedMesh).isInstancedMesh || (obj as THREE.Mesh).isMesh) {
        drawCalls++
      }
    })

    useGraphicsStore.getState().set({ fps, drawCalls })
    frameCount.current = 0
    elapsed.current = 0
  })

  return null
}
