'use client'

import { useEffect, useRef } from 'react'
import type { InputState } from '@/types'

/**
 * Tracks keyboard input via a ref (no re-renders).
 * Supports WASD, ZQSD (AZERTY), arrow keys, and E for interact.
 */
export function useInput() {
  const keys = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    interact: false,
    jump: false,
  })

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'KeyZ': case 'ArrowUp':
          keys.current.forward = true; break
        case 'KeyS': case 'ArrowDown':
          keys.current.backward = true; break
        case 'KeyA': case 'KeyQ': case 'ArrowLeft':
          keys.current.left = true; break
        case 'KeyD': case 'ArrowRight':
          keys.current.right = true; break
        case 'KeyE':
          keys.current.interact = true; break
        case 'Space':
          keys.current.jump = true; break
      }
    }

    const onUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'KeyZ': case 'ArrowUp':
          keys.current.forward = false; break
        case 'KeyS': case 'ArrowDown':
          keys.current.backward = false; break
        case 'KeyA': case 'KeyQ': case 'ArrowLeft':
          keys.current.left = false; break
        case 'KeyD': case 'ArrowRight':
          keys.current.right = false; break
        case 'KeyE':
          keys.current.interact = false; break
        case 'Space':
          keys.current.jump = false; break
      }
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  return keys
}
