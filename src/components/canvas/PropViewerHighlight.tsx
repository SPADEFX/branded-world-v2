'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { propRegistry } from '@/lib/testMapRef'
import { useEditorStore } from '@/stores/editorStore'
import { propViewerCameraAnim, currentEditorCam, propViewerFlyTo } from '@/lib/propViewerRef'
import { playerPosition } from '@/lib/playerRef'

const highlightMat = new THREE.MeshStandardMaterial({
  color: 0xffd040,
  emissive: 0xffd040,
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide,
  depthTest: true,
})

function getFirstInstanceWorldPos(inst: THREE.InstancedMesh): THREE.Vector3 {
  const mat = new THREE.Matrix4()
  inst.getMatrixAt(0, mat)
  const worldMat = new THREE.Matrix4().multiplyMatrices(inst.matrixWorld, mat)
  return new THREE.Vector3().setFromMatrixPosition(worldMat)
}

export function PropViewerHighlight() {
  const propViewerOpen   = useEditorStore((s) => s.propViewerOpen)
  const propViewerIndex  = useEditorStore((s) => s.propViewerIndex)
  const setPropViewerIndex = useEditorStore((s) => s.setPropViewerIndex)

  const { camera, scene } = useThree()
  const hlRef    = useRef<THREE.InstancedMesh | THREE.Mesh | null>(null)
  const pulseT   = useRef(0)

  // Pulse the highlight
  useFrame((_, delta) => {
    if (!propViewerOpen || !hlRef.current) return
    pulseT.current += delta * 2.5
    const p = 0.35 + Math.sin(pulseT.current) * 0.18
    highlightMat.opacity = p
    highlightMat.emissiveIntensity = 0.4 + Math.sin(pulseT.current) * 0.25
  })

  // Register flyTo — available to HUD buttons
  useEffect(() => {
    propViewerFlyTo.current = (index: number) => {
      const info = propRegistry.detailmisc[index]
      if (!info) return

      let tx = 0, ty = 0, tz = 0
      const sm = info.sceneMesh
      if ((sm as THREE.InstancedMesh).isInstancedMesh) {
        const pos = getFirstInstanceWorldPos(sm as THREE.InstancedMesh)
        tx = pos.x; ty = pos.y; tz = pos.z
      } else {
        const p = new THREE.Vector3()
        ;(sm as THREE.Mesh).getWorldPosition(p)
        tx = p.x; ty = p.y; tz = p.z
      }

      // Camera end position: elevated at 45° angle to the prop
      const endPy = ty + 18
      const endPz = tz + 14

      const dx = currentEditorCam.px - tx
      const dy = currentEditorCam.py - endPy
      const dz = currentEditorCam.pz - endPz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const duration = Math.max(350, Math.min(1100, dist * 18))

      propViewerCameraAnim.current = {
        startPx: currentEditorCam.px, startPy: currentEditorCam.py, startPz: currentEditorCam.pz,
        endPx:   tx,                  endPy,                        endPz,
        startTx: currentEditorCam.tx, startTy: currentEditorCam.ty, startTz: currentEditorCam.tz,
        endTx:   tx,  endTy: ty + info.height * 0.5, endTz: tz,
        startTime: performance.now(),
        duration,
      }

      setPropViewerIndex(index)
    }

    return () => { propViewerFlyTo.current = null }
  }, [camera, setPropViewerIndex])

  // Fly to first prop on open
  useEffect(() => {
    if (!propViewerOpen) return
    // Seed currentEditorCam from player position (camera just initialised there)
    currentEditorCam.px = playerPosition.x
    currentEditorCam.py = playerPosition.y + 9
    currentEditorCam.pz = playerPosition.z + 12
    currentEditorCam.tx = playerPosition.x
    currentEditorCam.ty = playerPosition.y
    currentEditorCam.tz = playerPosition.z
    propViewerFlyTo.current?.(propViewerIndex)
  }, [propViewerOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update highlight mesh when index or open state changes
  useEffect(() => {
    // Remove previous highlight
    if (hlRef.current) {
      scene.remove(hlRef.current)
      hlRef.current = null
    }
    if (!propViewerOpen) return

    const info = propRegistry.detailmisc[propViewerIndex]
    if (!info) return

    const sm = info.sceneMesh

    if ((sm as THREE.InstancedMesh).isInstancedMesh) {
      const orig = sm as THREE.InstancedMesh
      const hl = new THREE.InstancedMesh(orig.geometry, highlightMat, orig.count)
      hl.name = '__propViewerHighlight'
      const mat = new THREE.Matrix4()
      for (let i = 0; i < orig.count; i++) {
        orig.getMatrixAt(i, mat)
        hl.setMatrixAt(i, mat)
      }
      hl.instanceMatrix.needsUpdate = true
      // Match world transform of original (should be identity since orig is direct child of scene)
      hl.matrixWorld.copy(orig.matrixWorld)
      hl.matrixAutoUpdate = false
      scene.add(hl)
      hlRef.current = hl
    } else {
      const orig = sm as THREE.Mesh
      const hl = new THREE.Mesh(orig.geometry, highlightMat)
      hl.name = '__propViewerHighlight'
      orig.getWorldPosition(hl.position)
      orig.getWorldQuaternion(hl.quaternion)
      orig.getWorldScale(hl.scale)
      hl.matrixAutoUpdate = false
      hl.updateMatrix()
      scene.add(hl)
      hlRef.current = hl
    }

    return () => {
      if (hlRef.current) {
        scene.remove(hlRef.current)
        hlRef.current = null
      }
    }
  }, [propViewerIndex, propViewerOpen, scene])

  return null
}
