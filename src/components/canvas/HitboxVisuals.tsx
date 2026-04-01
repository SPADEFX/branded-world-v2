'use client'

import { useRef, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { hitboxMap, PLAYER_RADIUS } from '@/lib/hitboxes'
import { useEditorStore } from '@/stores/editorStore'
import { propRegistry } from '@/lib/testMapRef'
import { propViewerFlyTo } from '@/lib/propViewerRef'

const MAX_INSTANCES = 500
const _color = new THREE.Color('#00ff88')
const _circleColor = new THREE.Color('#00aaff')
const _mat = new THREE.MeshBasicMaterial({
  color: _color,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const _wireMat = new THREE.MeshBasicMaterial({
  color: _color,
  wireframe: true,
  transparent: true,
  opacity: 0.4,
})
const _circleMat = new THREE.MeshBasicMaterial({
  color: _circleColor,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const _circleWireMat = new THREE.MeshBasicMaterial({
  color: _circleColor,
  wireframe: true,
  transparent: true,
  opacity: 0.4,
})
const _dummy = new THREE.Object3D()
const _boxGeo = new THREE.BoxGeometry(1, 1, 1)
const _cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16)

export function HitboxVisuals() {
  const enabled = useEditorStore((s) => s.enabled)
  const showHitboxes = useEditorStore((s) => s.showHitboxes)
  const boxSolidRef = useRef<THREE.InstancedMesh>(null!)
  const boxWireRef = useRef<THREE.InstancedMesh>(null!)
  const cylSolidRef = useRef<THREE.InstancedMesh>(null!)
  const cylWireRef = useRef<THREE.InstancedMesh>(null!)
  const boxIdsRef = useRef<string[]>([])
  const cylIdsRef = useRef<string[]>([])

  const handleBoxClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId == null) return
    const id = boxIdsRef.current[e.instanceId]
    const baseName = id && hitboxMap[id]?.baseName
    if (!baseName) return
    const idx = propRegistry.detailmisc.findIndex((p) => p.baseName === baseName)
    if (idx >= 0) {
      useEditorStore.getState().setPropViewerCollection('detailmisc')
      if (propViewerFlyTo.current) propViewerFlyTo.current(idx)
    }
  }, [])

  const handleCylClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId == null) return
    const id = cylIdsRef.current[e.instanceId]
    const baseName = id && hitboxMap[id]?.baseName
    if (!baseName) return
    const idx = propRegistry.detailmisc.findIndex((p) => p.baseName === baseName)
    if (idx >= 0) {
      useEditorStore.getState().setPropViewerCollection('detailmisc')
      if (propViewerFlyTo.current) propViewerFlyTo.current(idx)
    }
  }, [])

  useFrame(() => {
    if (!boxSolidRef.current || !cylSolidRef.current) return

    const ids = Object.keys(hitboxMap)
    let boxCount = 0
    let cylCount = 0
    const boxIds: string[] = []
    const cylIds: string[] = []

    for (let i = 0; i < ids.length && (boxCount + cylCount) < MAX_INSTANCES; i++) {
      const id = ids[i]
      const hb = hitboxMap[id]

      const boxH = Math.max(hb.height - hb.minY, 0.01)
      const boxCY = hb.minY + boxH / 2

      if (hb.circle) {
        _dummy.position.set(hb.x, boxCY, hb.z)
        _dummy.rotation.y = 0
        _dummy.scale.set(hb.halfW + PLAYER_RADIUS, boxH, hb.halfW + PLAYER_RADIUS)
        _dummy.updateMatrix()
        cylSolidRef.current.setMatrixAt(cylCount, _dummy.matrix)
        cylWireRef.current.setMatrixAt(cylCount, _dummy.matrix)
        cylIds.push(id)
        cylCount++
      } else {
        _dummy.position.set(hb.x, boxCY, hb.z)
        _dummy.rotation.y = hb.rotY ?? 0
        _dummy.scale.set((hb.halfW + PLAYER_RADIUS) * 2, boxH, (hb.halfD + PLAYER_RADIUS) * 2)
        _dummy.updateMatrix()
        boxSolidRef.current.setMatrixAt(boxCount, _dummy.matrix)
        boxWireRef.current.setMatrixAt(boxCount, _dummy.matrix)
        boxIds.push(id)
        boxCount++
      }
    }

    boxIdsRef.current = boxIds
    cylIdsRef.current = cylIds

    boxSolidRef.current.count = boxCount
    boxWireRef.current.count = boxCount
    cylSolidRef.current.count = cylCount
    cylWireRef.current.count = cylCount

    boxSolidRef.current.instanceMatrix.needsUpdate = true
    boxWireRef.current.instanceMatrix.needsUpdate = true
    cylSolidRef.current.instanceMatrix.needsUpdate = true
    cylWireRef.current.instanceMatrix.needsUpdate = true
  })

  if (!enabled && !showHitboxes) return null

  return (
    <>
      <instancedMesh ref={boxSolidRef} args={[_boxGeo, _mat, MAX_INSTANCES]} frustumCulled={false} onClick={handleBoxClick} />
      <instancedMesh ref={boxWireRef} args={[_boxGeo, _wireMat, MAX_INSTANCES]} frustumCulled={false} onClick={handleBoxClick} />
      <instancedMesh ref={cylSolidRef} args={[_cylGeo, _circleMat, MAX_INSTANCES]} frustumCulled={false} onClick={handleCylClick} />
      <instancedMesh ref={cylWireRef} args={[_cylGeo, _circleWireMat, MAX_INSTANCES]} frustumCulled={false} onClick={handleCylClick} />
    </>
  )
}
