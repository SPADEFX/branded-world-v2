'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { visualMeshes } from '@/lib/testMapRef'
import { playerPosition } from '@/lib/playerRef'

const CULL_DIST_SQ = 75 * 75   // squared — no sqrt needed
const CHECK_INTERVAL = 10       // check every N frames

const _playerVec = new THREE.Vector3()
const _meshVec = new THREE.Vector3()

export function DistanceCuller() {
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current++
    if (frameCount.current % CHECK_INTERVAL !== 0) return

    const meshes = visualMeshes.current
    if (!meshes.length) return

    _playerVec.set(playerPosition.x, playerPosition.y, playerPosition.z)

    for (const mesh of meshes) {
      mesh.getWorldPosition(_meshVec)
      mesh.visible = _playerVec.distanceToSquared(_meshVec) < CULL_DIST_SQ
    }
  })

  return null
}
