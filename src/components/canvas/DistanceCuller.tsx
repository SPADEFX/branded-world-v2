'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { visualMeshes, setDressMeshes, detailMiscMeshes, detailMiscInstancedMeshes } from '@/lib/testMapRef'
import { playerPosition } from '@/lib/playerRef'

const CULL_DIST_SQ = 200 * 200
const SETDRESS_DIST_SQ = 15 * 15
const DETAILMISC_DIST_SQ = 20 * 20
const CHECK_INTERVAL = 10

const _playerVec = new THREE.Vector3()
const _meshVec = new THREE.Vector3()

// Per-instance culling state — cached original matrices + visibility flags
const _origMatrices  = new Map<THREE.InstancedMesh, Float32Array>()
const _instVisible   = new Map<THREE.InstancedMesh, Uint8Array>()
const _lastCullPos   = new THREE.Vector3(Infinity, 0, Infinity)

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

    // Per-instance culling: only re-run if player moved > 0.5u since last cull
    const playerMoved = _playerVec.distanceToSquared(_lastCullPos) > 0.25
    if (playerMoved) _lastCullPos.copy(_playerVec)

    for (const inst of detailMiscInstancedMeshes.current) {
      if (!playerMoved && _origMatrices.has(inst)) continue
      if (!_origMatrices.has(inst)) {
        _origMatrices.set(inst, (inst.instanceMatrix.array as Float32Array).slice())
        _instVisible.set(inst, new Uint8Array(inst.count).fill(1))
      }
      const orig    = _origMatrices.get(inst)!
      const wasVis  = _instVisible.get(inst)!
      const arr     = inst.instanceMatrix.array as Float32Array
      let changed   = false
      let anyVis    = false

      for (let i = 0; i < inst.count; i++) {
        const o  = i * 16
        const dx = _playerVec.x - orig[o + 12]
        const dz = _playerVec.z - orig[o + 14]
        const inRange = dx * dx + dz * dz < DETAILMISC_DIST_SQ

        if (inRange && !wasVis[i]) {
          arr.set(orig.subarray(o, o + 16), o)
          wasVis[i] = 1
          changed = true
        } else if (!inRange && wasVis[i]) {
          arr.fill(0, o, o + 16)
          wasVis[i] = 0
          changed = true
        }
        if (inRange) anyVis = true
      }

      inst.visible = anyVis
      if (changed) inst.instanceMatrix.needsUpdate = true
    }

  })

  return null
}
