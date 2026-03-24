'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { visualMeshes, setDressMeshes, detailMiscMeshes } from '@/lib/testMapRef'
import { playerPosition } from '@/lib/playerRef'

const CULL_DIST_SQ = 200 * 200
const SETDRESS_DIST_SQ = 15 * 15
const DETAILMISC_DIST_SQ = 30 * 30
const CHECK_INTERVAL = 10

const _playerVec = new THREE.Vector3()
const _meshVec = new THREE.Vector3()

export function DistanceCuller() {
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current++
    if (frameCount.current % CHECK_INTERVAL !== 0) return

    _playerVec.set(playerPosition.x, playerPosition.y, playerPosition.z)

    for (const mesh of visualMeshes.current) {
      mesh.getWorldPosition(_meshVec)
      mesh.visible = _playerVec.distanceToSquared(_meshVec) < CULL_DIST_SQ
    }

    for (const mesh of setDressMeshes.current) {
      mesh.getWorldPosition(_meshVec)
      mesh.visible = _playerVec.distanceToSquared(_meshVec) < SETDRESS_DIST_SQ
    }

    for (const mesh of detailMiscMeshes.current) {
      mesh.getWorldPosition(_meshVec)
      mesh.visible = _playerVec.distanceToSquared(_meshVec) < DETAILMISC_DIST_SQ
    }

  })

  return null
}
