'use client'

import { OrthographicCamera, OrbitControls } from '@react-three/drei'
import { useEditorStore } from '@/stores/editorStore'

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
  return (
    <OrbitControls
      enabled={!dragging}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      target={[0, 0, 0]}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={3}
      maxDistance={60}
    />
  )
}

export function EditorCamera() {
  const enabled = useEditorStore((s) => s.enabled)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const dragging = useEditorStore((s) => s.dragging)

  if (!enabled || cameraMode === 'follow') return null
  if (cameraMode === 'top') return <TopDownView dragging={dragging} />
  if (cameraMode === 'free') return <FreeOrbitView dragging={dragging} />
  return null
}
