'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { World } from './World'
import { Player } from './Player'
import { CameraRig } from './CameraRig'
import { InteractionZones } from './InteractionZones'
import { Lighting } from './Lighting'
import { NPCs } from './NPCs'
import { FootstepDust } from './FootstepDust'
import { EditorGizmo } from './EditorGizmo'
import { DynamicObjects } from './DynamicObjects'
import { PlacementPlane } from './PlacementPlane'
import { EditorCamera } from './EditorCamera'
import { HitboxVisuals } from './HitboxVisuals'
import { Collectibles } from './Collectibles'
import { SeasonalDecorations } from './SeasonalDecorations'
import { TestMap } from './TestMap'
import { FPSTracker } from './FPSTracker'
import { EffectComposer, Bloom, HueSaturation, BrightnessContrast, GodRays } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useGraphicsStore } from '@/stores/graphicsStore'

// Isolated component so store subscriptions never re-render the game objects
function PostProcessing() {
  const [sun, setSun] = useState<THREE.Mesh | null>(null)
  const { bloom, bloomIntensity, saturation, godRays, godRaysWeight } = useGraphicsStore()

  return (
    <>
      <mesh ref={setSun} position={[-30, 160, -160]}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#fff8e0" />
      </mesh>

      <EffectComposer>
        <Bloom intensity={bloom ? bloomIntensity : 0} luminanceThreshold={0.8} luminanceSmoothing={0.9} />
        <HueSaturation saturation={saturation} />
        <BrightnessContrast brightness={0.05} contrast={0.15} />
      </EffectComposer>
    </>
  )
}

function SceneContents() {
  return (
    <>
      <Lighting />
      {/* <World /> */}
      <Player />
      <InteractionZones />
      <NPCs />
      <Collectibles />
      <SeasonalDecorations />
      <TestMap />
      <FootstepDust />
      <CameraRig />
      <EditorGizmo />
      <DynamicObjects />
      <PlacementPlane />
      <HitboxVisuals />
      <EditorCamera />
      <PostProcessing />
      <FPSTracker />
    </>
  )
}

export function Experience() {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.8,
        powerPreference: 'high-performance',
      }}
      dpr={Math.min(window.devicePixelRatio, 1.5)}
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 10, 28] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  )
}
