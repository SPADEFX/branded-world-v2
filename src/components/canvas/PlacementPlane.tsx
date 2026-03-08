'use client'

import { useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useEditorStore, nextDynId } from '@/stores/editorStore'
import { MODEL_CATALOG } from '@/config/modelCatalog'

const ghostMat = new THREE.MeshBasicMaterial({
  color: '#22c55e',
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
})

/** Inner component — only mounted when placingModel is set */
function PlacementPlaneInner({ model }: { model: string }) {
  const { scene } = useGLTF(model)
  const ghostRef = useRef<THREE.Group>(null!)

  const ghostClone = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = ghostMat
      }
    })
    return c
  }, [scene])

  const handlePointerMove = (e: any) => {
    if (ghostRef.current) {
      ghostRef.current.position.set(e.point.x, 0, e.point.z)
      ghostRef.current.visible = true
    }
  }

  const handlePointerLeave = () => {
    if (ghostRef.current) ghostRef.current.visible = false
  }

  const catalogItem = MODEL_CATALOG.find((m) => m.path === model)

  const handleClick = (e: any) => {
    e.stopPropagation()
    if (!catalogItem) return
    useEditorStore.getState().addObject({
      id: nextDynId(),
      model,
      category: catalogItem.category,
      position: [
        Math.round(e.point.x * 10) / 10,
        0,
        Math.round(e.point.z * 10) / 10,
      ],
      rotation: 0,
      scale: catalogItem.defaultScale,
    })
  }

  return (
    <>
      <mesh
        position={[0, 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <group ref={ghostRef} visible={false} scale={catalogItem?.defaultScale ?? 1}>
        <primitive object={ghostClone} />
      </group>
    </>
  )
}

export function PlacementPlane() {
  const placingModel = useEditorStore((s) => s.placingModel)
  if (!placingModel) return null
  return <PlacementPlaneInner model={placingModel} />
}
