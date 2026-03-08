'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hitboxMap } from '@/lib/hitboxes'
import { useEditorStore } from '@/stores/editorStore'

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
  const boxSolidRef = useRef<THREE.InstancedMesh>(null!)
  const boxWireRef = useRef<THREE.InstancedMesh>(null!)
  const cylSolidRef = useRef<THREE.InstancedMesh>(null!)
  const cylWireRef = useRef<THREE.InstancedMesh>(null!)

  useFrame(() => {
    if (!boxSolidRef.current || !cylSolidRef.current) return

    const ids = Object.keys(hitboxMap)
    let boxCount = 0
    let cylCount = 0

    for (let i = 0; i < ids.length && (boxCount + cylCount) < MAX_INSTANCES; i++) {
      const hb = hitboxMap[ids[i]]

      if (hb.circle) {
        _dummy.position.set(hb.x, hb.height / 2, hb.z)
        _dummy.scale.set(hb.halfW, hb.height, hb.halfW) // radius x height x radius
        _dummy.updateMatrix()
        cylSolidRef.current.setMatrixAt(cylCount, _dummy.matrix)
        cylWireRef.current.setMatrixAt(cylCount, _dummy.matrix)
        cylCount++
      } else {
        _dummy.position.set(hb.x, hb.height / 2, hb.z)
        _dummy.scale.set(hb.halfW * 2, hb.height, hb.halfD * 2)
        _dummy.updateMatrix()
        boxSolidRef.current.setMatrixAt(boxCount, _dummy.matrix)
        boxWireRef.current.setMatrixAt(boxCount, _dummy.matrix)
        boxCount++
      }
    }

    boxSolidRef.current.count = boxCount
    boxWireRef.current.count = boxCount
    cylSolidRef.current.count = cylCount
    cylWireRef.current.count = cylCount

    boxSolidRef.current.instanceMatrix.needsUpdate = true
    boxWireRef.current.instanceMatrix.needsUpdate = true
    cylSolidRef.current.instanceMatrix.needsUpdate = true
    cylWireRef.current.instanceMatrix.needsUpdate = true
  })

  if (!enabled) return null

  return (
    <>
      <instancedMesh ref={boxSolidRef} args={[_boxGeo, _mat, MAX_INSTANCES]} frustumCulled={false} />
      <instancedMesh ref={boxWireRef} args={[_boxGeo, _wireMat, MAX_INSTANCES]} frustumCulled={false} />
      <instancedMesh ref={cylSolidRef} args={[_cylGeo, _circleMat, MAX_INSTANCES]} frustumCulled={false} />
      <instancedMesh ref={cylWireRef} args={[_cylGeo, _circleWireMat, MAX_INSTANCES]} frustumCulled={false} />
    </>
  )
}
