'use client'

import { useRef, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 50
const MAX_DIST = (JOYSTICK_SIZE - KNOB_SIZE) / 2

export function MobileControls() {
  const setJoystick = useGameStore((s) => s.setJoystickInput)
  const nearbyZone = useGameStore((s) => s.nearbyZone)
  const activeModal = useGameStore((s) => s.activeModal)
  const openModal = useGameStore((s) => s.openModal)
  const closeModal = useGameStore((s) => s.closeModal)

  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const touchIdRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })

  /* ── Joystick handlers ───────────────────────────────────── */

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return
    const touch = e.touches[0]
    touchIdRef.current = touch.identifier

    const rect = joystickRef.current?.getBoundingClientRect()
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i]
        if (t.identifier !== touchIdRef.current) continue

        const dx = t.clientX - centerRef.current.x
        const dy = t.clientY - centerRef.current.y
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DIST)
        const angle = Math.atan2(dy, dx)

        const nx = (Math.cos(angle) * dist) / MAX_DIST
        const ny = (Math.sin(angle) * dist) / MAX_DIST

        if (knobRef.current) {
          knobRef.current.style.transform = `translate(${nx * MAX_DIST}px, ${ny * MAX_DIST}px)`
        }
        setJoystick({ x: nx, y: ny })
        break
      }
    },
    [setJoystick],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier !== touchIdRef.current) continue
        touchIdRef.current = null
        setJoystick({ x: 0, y: 0 })
        if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
        break
      }
    },
    [setJoystick],
  )

  /* ── Interact button ─────────────────────────────────────── */

  const onInteract = useCallback(() => {
    if (activeModal) {
      closeModal()
    } else if (nearbyZone) {
      openModal(nearbyZone)
    }
  }, [activeModal, closeModal, nearbyZone, openModal])

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-end justify-between p-6 pb-10">
      {/* Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
        style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE, touchAction: 'none' }}
      >
        <div
          ref={knobRef}
          className="rounded-full bg-white/40 backdrop-blur-md"
          style={{ width: KNOB_SIZE, height: KNOB_SIZE }}
        />
      </div>

      {/* Interact button — only visible when relevant */}
      {(nearbyZone || activeModal) && (
        <button
          onTouchStart={onInteract}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 text-xl font-bold text-white backdrop-blur-md active:scale-90"
          style={{ touchAction: 'none' }}
        >
          {activeModal ? '\u2715' : 'E'}
        </button>
      )}
    </div>
  )
}
