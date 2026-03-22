'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGraphicsStore } from '@/stores/graphicsStore'

export function FPSTracker() {
  const frameCount = useRef(0)
  const elapsed = useRef(0)

  useFrame(({ gl }, delta) => {
    frameCount.current++
    elapsed.current += delta

    if (elapsed.current >= 0.5) {
      const fps = Math.round(frameCount.current / elapsed.current)
      const drawCalls = gl.info.render.calls
      useGraphicsStore.getState().set({ fps, drawCalls })
      frameCount.current = 0
      elapsed.current = 0
    }
  })

  return null
}
