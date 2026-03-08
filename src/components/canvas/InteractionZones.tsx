'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ZONES } from '@/config/zones'
import { NPC_LIST, NPC_INTERACTION_RADIUS } from '@/config/npcs'
import { useGameStore } from '@/stores/gameStore'
import { useEditorStore } from '@/stores/editorStore'
import { playerPosition, npcPositions } from '@/lib/playerRef'

/* ── Single zone visual marker ─────────────────────────────── */

function ZoneMarker({ position, color }: { position: [number, number, number]; color: string }) {
  const diamondRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    diamondRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2
    diamondRef.current.rotation.y = state.clock.elapsedTime * 0.5
  })

  return (
    <group position={position}>
      {/* Ground ring */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.3, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating diamond */}
      <mesh ref={diamondRef} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Light pillar */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

/* ── All zones + proximity checker ─────────────────────────── */

export function InteractionZones() {
  const editorEnabled = useEditorStore((s) => s.enabled)

  useFrame(() => {
    // Skip proximity checks while editing
    if (editorEnabled) return

    const state = useGameStore.getState()
    const { x, z } = playerPosition

    // ── Zone proximity ──
    let closestZone: string | null = null
    let closestZoneDist = Infinity

    for (const zone of ZONES) {
      const dx = x - zone.position[0]
      const dz = z - zone.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < zone.radius && dist < closestZoneDist) {
        closestZoneDist = dist
        closestZone = zone.id
      }
    }

    if (closestZone !== state.nearbyZone) {
      useGameStore.setState({ nearbyZone: closestZone })
    }

    // ── NPC proximity ──
    let closestNPC: string | null = null
    let closestNPCDist = Infinity

    for (const npc of NPC_LIST) {
      const npcPos = npcPositions[npc.id]
      if (!npcPos) continue
      const dx = x - npcPos.x
      const dz = z - npcPos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < NPC_INTERACTION_RADIUS && dist < closestNPCDist) {
        closestNPCDist = dist
        closestNPC = npc.id
      }
    }

    if (closestNPC !== state.nearbyNPC) {
      useGameStore.setState({ nearbyNPC: closestNPC })
    }
  })

  // Hide zone markers when editing
  if (editorEnabled) return null

  return (
    <group>
      {ZONES.map((zone) => (
        <ZoneMarker key={zone.id} position={zone.position} color={zone.color} />
      ))}
    </group>
  )
}
