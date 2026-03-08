'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── Gradient shader for Solana bars ──────────────────────── */

const barVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const barFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  void main() {
    // Purple-to-teal gradient along X
    vec3 grad = mix(uColorA, uColorB, vUv.x);

    // Subtle emissive pulse
    float pulse = 0.85 + 0.15 * sin(uTime * 1.5);
    vec3 col = grad * pulse;

    gl_FragColor = vec4(col, 1.0);
  }
`

/* ── Single bar ───────────────────────────────────────────── */

function SolanaBar({
  position,
  rotZ,
}: {
  position: [number, number, number]
  rotZ: number
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#9945FF') },
      uColorB: { value: new THREE.Color('#14F195') },
    }),
    []
  )

  useFrame((_, delta) => {
    matRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={position} rotation={[0, 0, rotZ]} castShadow>
      <boxGeometry args={[2.4, 0.32, 0.3]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={barVertexShader}
        fragmentShader={barFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

/* ── Monument ─────────────────────────────────────────────── */

export function SolanaMonument() {
  const logoRef = useRef<THREE.Group>(null!)

  // Very slow rotation of the logo
  useFrame((_, delta) => {
    if (logoRef.current) {
      logoRef.current.rotation.y += delta * 0.08
    }
  })

  return (
    <group>
      {/* Stone pedestal — octagonal */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 1.2, 8]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Pedestal cap ring */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.06, 8]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.85} />
      </mesh>

      {/* Logo group — sits on pedestal */}
      <group ref={logoRef} position={[0, 2.05, 0]}>
        {/* Top bar — slants down-right */}
        <SolanaBar position={[0, 0.45, 0]} rotZ={0.2} />
        {/* Middle bar — slants down-left (reversed) */}
        <SolanaBar position={[0, 0, 0]} rotZ={-0.2} />
        {/* Bottom bar — slants down-right */}
        <SolanaBar position={[0, -0.45, 0]} rotZ={0.2} />

        {/* Subtle glow plane behind bars */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[3, 1.8]} />
          <meshBasicMaterial
            color="#7c3aed"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}
