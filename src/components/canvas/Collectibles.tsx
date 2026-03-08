'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { useEditorStore } from '@/stores/editorStore'
import { playerPosition } from '@/lib/playerRef'
import {
  COLLECTIBLES,
  COLLECTIBLE_MODELS,
  COLLECTIBLE_GLOW,
  COLLECTIBLE_PICKUP_RADIUS,
} from '@/config/collectibles'

/* ── Shared ring geometry + material (created once) ────────── */

const _ringGeo = new THREE.RingGeometry(0.3, 0.5, 16)

/* ── Single collectible (no useFrame, no pointLight) ───────── */

function Collectible({
  index,
  groupsRef,
  innersRef,
}: {
  index: number
  groupsRef: React.MutableRefObject<THREE.Group[]>
  innersRef: React.MutableRefObject<THREE.Group[]>
}) {
  const item = COLLECTIBLES[index]
  const { scene } = useGLTF(COLLECTIBLE_MODELS[item.type])
  const groupRef = useRef<THREE.Group>(null!)
  const innerRef = useRef<THREE.Group>(null!)
  const glowColor = COLLECTIBLE_GLOW[item.type]

  const model = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).castShadow = true
      }
    })
    return clone
  }, [scene])

  // Register refs so the parent useFrame can drive animation
  useEffect(() => {
    groupsRef.current[index] = groupRef.current
    innersRef.current[index] = innerRef.current
  }, [index, groupsRef, innersRef])

  return (
    <group ref={groupRef} position={item.position}>
      <group ref={innerRef} scale={3}>
        <primitive object={model} />
      </group>
      {/* Ground ring (emissive, no light) */}
      <mesh
        position={[0, -item.position[1] + 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={_ringGeo}
      >
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/* ── Container — single useFrame drives all collectibles ──── */

const PICKUP_R_SQ = COLLECTIBLE_PICKUP_RADIUS * COLLECTIBLE_PICKUP_RADIUS

export function Collectibles() {
  const editorEnabled = useEditorStore((s) => s.enabled)

  const groupsRef = useRef<THREE.Group[]>([])
  const innersRef = useRef<THREE.Group[]>([])

  // Per-item animation state (avoids per-component refs)
  const stateRef = useRef(
    COLLECTIBLES.map(() => ({
      phase: Math.random() * Math.PI * 2,
      pickupT: -1, // -1 = not picked up, 0..1 = animating, >= 1 = done
    })),
  )

  useFrame((clock) => {
    const elapsed = clock.clock.elapsedTime
    const collectedIds = useGameStore.getState().collectedIds

    for (let i = 0; i < COLLECTIBLES.length; i++) {
      const group = groupsRef.current[i]
      const inner = innersRef.current[i]
      if (!group || !inner) continue

      const item = COLLECTIBLES[i]
      const s = stateRef.current[i]

      // Already fully collected — hide and skip
      if (s.pickupT >= 1) {
        group.visible = false
        continue
      }

      // Pickup animation in progress
      if (s.pickupT >= 0) {
        s.pickupT += 0.05 // ~3x at 60fps
        if (s.pickupT >= 1) {
          group.visible = false
          continue
        }
        const scale = (1 - s.pickupT) * 3
        inner.scale.setScalar(scale)
        group.position.y = item.position[1] + s.pickupT * 2
        inner.rotation.y += 0.3
        continue
      }

      // Already collected (page reload etc.) — hide immediately
      if (collectedIds.includes(item.id)) {
        s.pickupT = 1
        group.visible = false
        continue
      }

      // Bob + spin
      group.position.y = item.position[1] + Math.sin(elapsed * 2 + s.phase) * 0.15
      inner.rotation.y = elapsed * 1.5 + s.phase

      // Proximity check (squared distance, no sqrt)
      const dx = playerPosition.x - item.position[0]
      const dz = playerPosition.z - item.position[2]
      if (dx * dx + dz * dz < PICKUP_R_SQ) {
        useGameStore.getState().collectItem(item)
        s.pickupT = 0
      }
    }
  })

  if (editorEnabled) return null

  return (
    <group>
      {COLLECTIBLES.map((_, i) => (
        <Collectible
          key={COLLECTIBLES[i].id}
          index={i}
          groupsRef={groupsRef}
          innersRef={innersRef}
        />
      ))}
    </group>
  )
}

/* ── Preload ───────────────────────────────────────────────── */

const uniqueModels = [...new Set(Object.values(COLLECTIBLE_MODELS))]
uniqueModels.forEach((path) => useGLTF.preload(path))
