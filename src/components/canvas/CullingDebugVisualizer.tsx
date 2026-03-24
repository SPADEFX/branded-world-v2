'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { playerPosition } from '@/lib/playerRef'
import { useEditorStore } from '@/stores/editorStore'

const ZONES = [
  { radius: 15,  color: '#ffaa00', label: 'setdress · 15u' },
  { radius: 30,  color: '#00ff99', label: 'detailmisc · 30u' },
  { radius: 200, color: '#4499ff', label: 'visual · 200u' },
]

export function CullingDebugVisualizer() {
  const cullingDebug = useEditorStore((s) => s.cullingDebug)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(playerPosition.x, playerPosition.y, playerPosition.z)
  })

  if (!cullingDebug) return null

  return (
    <group ref={groupRef}>
      {/* Vertical red pole above player */}
      <mesh position={[0, 50, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 100, 4]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>

      {ZONES.map(({ radius, color, label }) => {
        const segs = radius > 100 ? 24 : 48
        const rings = radius > 100 ? 8 : 16
        return (
          <group key={radius}>
            {/* Wireframe upper hemisphere */}
            <mesh>
              <sphereGeometry args={[radius, segs, rings, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshBasicMaterial color={color} wireframe transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            {/* Ground ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius - 0.15, radius + 0.15, segs]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
            {/* Label */}
            <Text
              position={[radius + 1, 2, 0]}
              fontSize={Math.max(0.8, radius * 0.05)}
              color={color}
              anchorX="left"
              anchorY="middle"
              depthOffset={-1}
            >
              {label}
            </Text>
          </group>
        )
      })}
    </group>
  )
}
