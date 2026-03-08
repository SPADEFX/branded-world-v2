'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPosition } from '@/lib/playerRef'

const POOL_SIZE = 40
const SPAWN_INTERVAL = 0.08
const PARTICLE_LIFETIME = 0.6
const SPREAD = 0.3
const RISE_SPEED = 0.8
const DRIFT_SPEED = 0.4
const START_SIZE = 8
const END_SIZE = 2
const START_OPACITY = 0.35

export function FootstepDust() {
  const pointsRef = useRef<THREE.Points>(null!)
  const spawnTimer = useRef(0)
  const nextIndex = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })

  const { positions, opacities, sizes, velocities, ages, lifetimes } = useMemo(() => {
    const positions = new Float32Array(POOL_SIZE * 3)
    const opacities = new Float32Array(POOL_SIZE)
    const sizes = new Float32Array(POOL_SIZE)
    const velocities = new Float32Array(POOL_SIZE * 3)
    const ages = new Float32Array(POOL_SIZE).fill(999)
    const lifetimes = new Float32Array(POOL_SIZE).fill(PARTICLE_LIFETIME)

    // Hide all particles initially
    for (let i = 0; i < POOL_SIZE; i++) {
      positions[i * 3 + 1] = -100
      opacities[i] = 0
      sizes[i] = 0
    }

    return { positions, opacities, sizes, velocities, ages, lifetimes }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, opacities, sizes])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {},
      vertexShader: `
        attribute float aOpacity;
        attribute float aSize;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.15, d) * vOpacity;
          gl_FragColor = vec4(0.85, 0.8, 0.72, alpha);
        }
      `,
    })
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { x, z } = playerPosition
    const y = playerPosition.y

    // Detect movement
    const dx = x - prevPos.current.x
    const dz = z - prevPos.current.z
    const speed = Math.sqrt(dx * dx + dz * dz) / dt
    const isMoving = speed > 1.5 && y < 0.1 // Only on ground

    prevPos.current.x = x
    prevPos.current.z = z

    // Spawn new particles
    if (isMoving) {
      spawnTimer.current += dt
      while (spawnTimer.current >= SPAWN_INTERVAL) {
        spawnTimer.current -= SPAWN_INTERVAL
        const i = nextIndex.current
        nextIndex.current = (nextIndex.current + 1) % POOL_SIZE

        // Spawn at feet with slight random offset
        positions[i * 3] = x + (Math.random() - 0.5) * SPREAD
        positions[i * 3 + 1] = 0.05
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * SPREAD

        // Random outward drift
        const angle = Math.random() * Math.PI * 2
        velocities[i * 3] = Math.cos(angle) * DRIFT_SPEED + (Math.random() - 0.5) * 0.2
        velocities[i * 3 + 1] = RISE_SPEED + Math.random() * 0.3
        velocities[i * 3 + 2] = Math.sin(angle) * DRIFT_SPEED + (Math.random() - 0.5) * 0.2

        ages[i] = 0
        lifetimes[i] = PARTICLE_LIFETIME + (Math.random() - 0.5) * 0.2
      }
    } else {
      spawnTimer.current = 0
    }

    // Update all particles
    for (let i = 0; i < POOL_SIZE; i++) {
      if (ages[i] >= lifetimes[i]) continue

      ages[i] += dt
      const t = ages[i] / lifetimes[i] // 0→1

      // Move
      positions[i * 3] += velocities[i * 3] * dt
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt

      // Slow down drift over time
      velocities[i * 3] *= 1 - 2 * dt
      velocities[i * 3 + 1] *= 1 - 1.5 * dt
      velocities[i * 3 + 2] *= 1 - 2 * dt

      // Fade out & shrink
      opacities[i] = START_OPACITY * (1 - t * t)
      sizes[i] = THREE.MathUtils.lerp(START_SIZE, END_SIZE, t)
    }

    // Update GPU buffers
    const geo = pointsRef.current.geometry
    ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(geo.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true
    ;(geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}
