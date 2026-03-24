'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPosition } from '@/lib/playerRef'
import { isIndoorsRef } from '@/lib/playerRef'
import { useEditorStore } from '@/stores/editorStore'
import { DOOR_TRIGGERS } from '@/config/indoorZones'

const _arrowDir = new THREE.Vector3()
const _arrowOrigin = new THREE.Vector3()

/** Visual indicator for a single door trigger (editor only) */
function DoorVisual({ x, z, radius, nx, nz }: { x: number; z: number; radius: number; nx: number; nz: number }) {
  return (
    <group position={[x, 0.1, z]}>
      {/* Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 24]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.05, radius, 24]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Arrow pointing INTO building */}
      <arrowHelper
        args={[
          new THREE.Vector3(nx, 0, nz),
          new THREE.Vector3(0, 0, 0),
          radius * 0.8,
          0xf59e0b,
          0.3,
          0.2,
        ]}
      />
    </group>
  )
}

export function DoorTriggers() {
  const enabled = useEditorStore((s) => s.enabled)

  useFrame(() => {
    if (!DOOR_TRIGGERS.length) return

    const px = playerPosition.x
    const pz = playerPosition.z

    for (const door of DOOR_TRIGGERS) {
      const dx = px - door.x
      const dz = pz - door.z
      const distSq = dx * dx + dz * dz

      if (distSq < door.radius * door.radius) {
        // Dot product: positive = player on the INSIDE (same side as inward normal)
        const dot = dx * door.nx + dz * door.nz
        isIndoorsRef.current = dot > 0
      }
    }
  })

  if (!enabled || !DOOR_TRIGGERS.length) return null

  return (
    <>
      {DOOR_TRIGGERS.map((door) => (
        <DoorVisual key={door.id} {...door} />
      ))}
    </>
  )
}
