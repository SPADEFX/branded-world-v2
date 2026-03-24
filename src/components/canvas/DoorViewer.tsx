'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '@/stores/editorStore'
import { testMapScene } from '@/lib/testMapRef'

const DIM_MAT = new THREE.MeshBasicMaterial({
  color: 0x111122,
  transparent: true,
  opacity: 0.07,
  depthWrite: false,
})

const WIRE_MAT = new THREE.MeshBasicMaterial({
  color: 0x4a9eff,
  wireframe: true,
  transparent: true,
  opacity: 0.55,
})

type SavedMat = THREE.Material | THREE.Material[]

export function DoorViewer() {
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)
  const doorViewStyle = useEditorStore((s) => s.doorViewStyle)
  const savedRef = useRef<Map<THREE.Mesh, SavedMat>>(new Map())

  useEffect(() => {
    const saved = savedRef.current

    // Always restore first
    saved.forEach((mat, mesh) => { mesh.material = mat })
    saved.clear()

    if (!viewDoorsMode || doorViewStyle === 'full') return

    // Apply chosen style to all scene meshes
    const replaceMat = doorViewStyle === 'xray' ? DIM_MAT : WIRE_MAT

    testMapScene.current.forEach((scene) => {
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        saved.set(mesh, mesh.material)
        mesh.material = replaceMat
      })
    })

    return () => {
      saved.forEach((mat, mesh) => { mesh.material = mat })
      saved.clear()
    }
  }, [viewDoorsMode, doorViewStyle])

  return null
}
