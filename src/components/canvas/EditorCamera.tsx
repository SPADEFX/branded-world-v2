'use client'

import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrthographicCamera, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useEditorStore } from '@/stores/editorStore'
import { freeCameraJumpTarget, playerPosition } from '@/lib/playerRef'
import { propViewerCameraAnim, currentEditorCam } from '@/lib/propViewerRef'

/** Orthographic top-down — scroll to zoom, right-drag to pan */
function TopDownView({ dragging }: { dragging: boolean }) {
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 50, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        zoom={25}
        near={0.1}
        far={200}
      />
      <OrbitControls
        enabled={!dragging}
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        screenSpacePanning={true}
        zoomToCursor
      />
    </>
  )
}

/** Free orbit — full orbit/pan/zoom like Blender */
function FreeOrbitView({ dragging }: { dragging: boolean }) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()

  useFrame(() => {
    // Track camera state for prop viewer
    currentEditorCam.px = camera.position.x
    currentEditorCam.py = camera.position.y
    currentEditorCam.pz = camera.position.z
    if (controlsRef.current) {
      currentEditorCam.tx = controlsRef.current.target.x
      currentEditorCam.ty = controlsRef.current.target.y
      currentEditorCam.tz = controlsRef.current.target.z
    }

    // Smooth Bezier camera animation (prop viewer navigation)
    const anim = propViewerCameraAnim.current
    if (anim && controlsRef.current) {
      const t = Math.min((performance.now() - anim.startTime) / anim.duration, 1)
      const ease = t * t * (3 - 2 * t)  // smoothstep — slow start, fast middle, slow end
      camera.position.set(
        anim.startPx + (anim.endPx - anim.startPx) * ease,
        anim.startPy + (anim.endPy - anim.startPy) * ease,
        anim.startPz + (anim.endPz - anim.startPz) * ease,
      )
      controlsRef.current.target.set(
        anim.startTx + (anim.endTx - anim.startTx) * ease,
        anim.startTy + (anim.endTy - anim.startTy) * ease,
        anim.startTz + (anim.endTz - anim.startTz) * ease,
      )
      controlsRef.current.update()
      if (t >= 1) propViewerCameraAnim.current = null
      return
    }

    // Instant jump (doors sidebar etc.)
    const jt = freeCameraJumpTarget.current
    if (!jt || !controlsRef.current) return
    freeCameraJumpTarget.current = null
    controlsRef.current.target.set(jt.x, jt.y, jt.z)
    camera.position.set(jt.x, jt.y + 9, jt.z + 12)
    controlsRef.current.update()
  })

  const { x, y, z } = playerPosition

  return (
    <>
      <PerspectiveCamera makeDefault fov={45} near={0.1} far={2000} position={[x, y + 9, z + 12]} />
      <OrbitControls
        ref={controlsRef}
        enabled={!dragging}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={[x, y, z]}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={300}
      />
    </>
  )
}

export function EditorCamera() {
  const enabled = useEditorStore((s) => s.enabled)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const dragging = useEditorStore((s) => s.dragging)
  const freeCamActive = useEditorStore((s) => s.freeCamActive)
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)

  // Also activate for free cam / view doors triggered outside the editor
  const wantFree = freeCamActive || viewDoorsMode
  if (!enabled && !wantFree) return null
  if (enabled && cameraMode === 'top') return <TopDownView dragging={dragging} />
  if (enabled && cameraMode === 'follow') return null
  return <FreeOrbitView dragging={dragging} />
}
