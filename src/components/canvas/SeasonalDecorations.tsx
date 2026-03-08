'use client'

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  getActiveSeason,
  HALLOWEEN_DECORATIONS,
  CHRISTMAS_DECORATIONS,
} from '@/config/seasonal'
import type { Season } from '@/config/seasonal'

/* ── Single decoration ─────────────────────────────────────── */

function Decoration({
  model: modelPath,
  position,
  rotation,
  scale,
}: {
  model: string
  position: [number, number, number]
  rotation: number
  scale: number
}) {
  const { scene } = useGLTF(modelPath)

  const clone = useMemo(() => {
    const c = scene.clone()
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return c
  }, [scene])

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={clone} scale={scale} />
    </group>
  )
}

/* ── Container — only renders during the active season ────── */

export function SeasonalDecorations() {
  const season: Season = useMemo(() => getActiveSeason(), [])

  if (season === 'none') return null

  const decorations =
    season === 'halloween' ? HALLOWEEN_DECORATIONS : CHRISTMAS_DECORATIONS

  return (
    <group>
      {decorations.map((dec, i) => (
        <Decoration key={`${season}-${i}`} {...dec} />
      ))}
    </group>
  )
}

/* ── Preload only the active season's models ──────────────── */

const season = getActiveSeason()
if (season === 'halloween') {
  const models = [...new Set(HALLOWEEN_DECORATIONS.map((d) => d.model))]
  models.forEach((m) => useGLTF.preload(m))
} else if (season === 'christmas') {
  const models = [...new Set(CHRISTMAS_DECORATIONS.map((d) => d.model))]
  models.forEach((m) => useGLTF.preload(m))
}
