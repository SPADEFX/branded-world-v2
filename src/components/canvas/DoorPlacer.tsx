'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEditorStore } from '@/stores/editorStore'
import { testMapScene } from '@/lib/testMapRef'

const DOOR_W = 2.0    // width of the rectangle
const DOOR_H = 2.5    // height
const TRIGGER_R = 1.2 // stored trigger radius
const ROT_STEP = Math.PI / 12  // 15° per X/C press

const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()

// Mutable hover state — no React re-renders
const _hover = {
  groundPos: null as THREE.Vector3 | null,
  rotY: 0,
}

export function DoorPlacer() {
  const placeDoorMode = useEditorStore((s) => s.placeDoorMode)
  const setPlaceDoorMode = useEditorStore((s) => s.setPlaceDoorMode)
  const { gl, camera, scene } = useThree()

  const groupRef = useRef<THREE.Group | null>(null)

  // Build 3D door rectangle once — two back-to-back planes + edge outline
  useEffect(() => {
    const group = new THREE.Group()
    const planeGeo = new THREE.PlaneGeometry(DOOR_W, DOOR_H)

    // Green face = entry / inside (faces local +Z = inward normal direction)
    const greenMesh = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.72, side: THREE.FrontSide }),
    )
    greenMesh.position.y = DOOR_H / 2

    // Red face = exit / outside (faces local -Z, rotated 180°)
    const redMesh = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.72, side: THREE.FrontSide }),
    )
    redMesh.rotation.y = Math.PI
    redMesh.position.y = DOOR_H / 2

    // White edge outline
    const boxGeo = new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.01)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat)
    edges.position.y = DOOR_H / 2

    // Ground disc shadow
    const discGeo = new THREE.CircleGeometry(TRIGGER_R, 24)
    const discMesh = new THREE.Mesh(
      discGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }),
    )
    discMesh.rotation.x = -Math.PI / 2
    discMesh.position.y = 0.01

    // Small green arrow showing inside direction
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0.15, 0),
      TRIGGER_R * 0.9,
      0x22c55e,
      0.3,
      0.2,
    )

    group.add(greenMesh, redMesh, edges, discMesh, arrow)
    group.visible = false
    scene.add(group)
    groupRef.current = group

    return () => {
      scene.remove(group)
      planeGeo.dispose()
      boxGeo.dispose()
      edgeMat.dispose()
      discGeo.dispose()
      groupRef.current = null
    }
  }, [scene])

  // Mouse + keyboard handlers — active only while placeDoorMode is on
  useEffect(() => {
    if (!placeDoorMode) {
      _hover.groundPos = null
      return
    }

    const el = gl.domElement

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      _raycaster.setFromCamera(_mouse, camera)
      _raycaster.far = 500
      const hits = _raycaster.intersectObjects(testMapScene.current, true)
      _hover.groundPos = hits.length > 0 ? hits[0].point.clone() : null
    }

    // X = rotate left, C = rotate right (repeat fires while held)
    const onKey = (e: KeyboardEvent) => {
      if (!placeDoorMode) return
      if (e.key === 'x' || e.key === 'X') _hover.rotY -= ROT_STEP
      if (e.key === 'c' || e.key === 'C') _hover.rotY += ROT_STEP
    }

    const onClick = (e: MouseEvent) => {
      if (!_hover.groundPos) return
      e.stopPropagation()
      const { x, y, z } = _hover.groundPos
      // Local +Z in world coords = (sin(rotY), 0, cos(rotY)) = inward direction
      const nx = parseFloat(Math.sin(_hover.rotY).toFixed(3))
      const nz = parseFloat(Math.cos(_hover.rotY).toFixed(3))
      useEditorStore.getState().addDoor({
        id: `door_${Date.now()}`,
        x,
        y,
        z,
        radius: TRIGGER_R,
        nx,
        nz,
      })
      setPlaceDoorMode(false)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
      _hover.groundPos = null
    }
  }, [placeDoorMode, gl, camera, setPlaceDoorMode])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    if (!placeDoorMode || !_hover.groundPos) {
      group.visible = false
      return
    }

    group.visible = true
    group.position.copy(_hover.groundPos)
    group.rotation.y = _hover.rotY
  })

  return null
}
