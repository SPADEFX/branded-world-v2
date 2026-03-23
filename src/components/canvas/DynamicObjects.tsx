'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useEditorStore, editorRefs } from '@/stores/editorStore'
import { registerModelHitboxes, unregisterModelHitboxes } from '@/lib/hitboxes'
import type { EditorObject } from '@/stores/editorStore'

const TEXTURED_CATEGORIES = ['pirate', 'watercraft', 'graveyard', 'survival']

/* ── Shared colormap textures ─────────────────────────────── */

const textureCache: Record<string, THREE.Texture> = {}

function getCachedTexture(category: string): THREE.Texture {
  if (!textureCache[category]) {
    const tex = new THREE.TextureLoader().load(`/models/${category}/Textures/colormap.png`)
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    textureCache[category] = tex
  }
  return textureCache[category]
}

/* ── Red outline material (BackSide, shared) ──────────────── */

const outlineMat = new THREE.MeshBasicMaterial({
  color: '#ef4444',
  side: THREE.BackSide,
})

/* ── Single dynamic object ────────────────────────────────── */

function DynamicObject({ obj }: { obj: EditorObject }) {
  const { scene } = useGLTF(obj.model)
  const groupRef = useRef<THREE.Group>(null!)
  const useTex = TEXTURED_CATEGORIES.includes(obj.category)
  const eraserMode = useEditorStore((s) => s.eraserMode)
  const hitboxVersion = useEditorStore((s) => s.hitboxVersion)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    editorRefs[obj.id] = groupRef.current
    registerModelHitboxes(obj.id, obj.model, obj.position[0], obj.position[2], obj.rotation, obj.scale, scene)
    return () => {
      delete editorRefs[obj.id]
      unregisterModelHitboxes(obj.id, obj.model)
    }
  }, [obj.id])

  // Update hitbox when position/scale changes (after gizmo drag) or hitbox config changes
  useEffect(() => {
    unregisterModelHitboxes(obj.id, obj.model)
    registerModelHitboxes(obj.id, obj.model, obj.position[0], obj.position[2], obj.rotation, obj.scale, scene)
  }, [obj.position, obj.scale, hitboxVersion])

  // Clear hover when eraser toggles off
  useEffect(() => {
    if (!eraserMode) setHovered(false)
  }, [eraserMode])

  const handleClick = (e: any) => {
    e.stopPropagation()
    const state = useEditorStore.getState()
    if (state.eraserMode) {
      state.removeObject(obj.id)
      return
    }
    if (!state.enabled) return
    state.select(obj.id)
  }

  const handlePointerEnter = () => {
    if (useEditorStore.getState().eraserMode) setHovered(true)
  }

  const handlePointerLeave = () => setHovered(false)

  // Clone the model — for textured kits apply the external colormap,
  // for nature keep the original materials (flat baseColorFactor colors)
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (useTex) {
          const texture = getCachedTexture(obj.category)
          mesh.material = new THREE.MeshStandardMaterial({ map: texture })
        } else {
          // Preserve the original material (clone it so instances don't share)
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial
          // Kenney nature GLBs export with metallic=1 which looks black without
          // an environment map — force non-metallic for correct flat colors
          if ('metalness' in mat) mat.metalness = 0
          mesh.material = mat
        }
      }
    })
    return c
  }, [scene, useTex, obj.category])

  // Red outline clone (inverted hull)
  const outlineClone = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = outlineMat
        child.scale.multiplyScalar(1.06)
      }
    })
    return c
  }, [scene])

  return (
    <group
      ref={groupRef}
      position={obj.position}
      rotation={[0, obj.rotation, 0]}
      scale={obj.scale}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <primitive object={cloned} />
      {hovered && <primitive object={outlineClone} />}
    </group>
  )
}

/* ── Container ────────────────────────────────────────────── */

export function DynamicObjects() {
  const dynamicObjects = useEditorStore((s) => s.dynamicObjects)
  if (dynamicObjects.length === 0) return null
  return (
    <group>
      {dynamicObjects.map((obj) => (
        <DynamicObject key={obj.id} obj={obj} />
      ))}
    </group>
  )
}
