'use client'

import { Suspense } from 'react'
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

export function Experience() {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ fov: 45, near: 0.1, far: 400, position: [0, 10, 28] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <World />
        <Player />
        <InteractionZones />
        <NPCs />
        <Collectibles />
        <SeasonalDecorations />
        <FootstepDust />
        <CameraRig />
        <EditorGizmo />
        <DynamicObjects />
        <PlacementPlane />
        <HitboxVisuals />
        <EditorCamera />
      </Suspense>
    </Canvas>
  )
}
