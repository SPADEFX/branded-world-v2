'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEditorStore } from '@/stores/editorStore'
import { testMapScene } from '@/lib/testMapRef'
import { teleportTarget } from '@/lib/playerRef'

const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
const _hitPos = { current: null as THREE.Vector3 | null }

export function TeleportGhost() {
  const teleportMode = useEditorStore((s) => s.teleportMode)
  const setTeleportMode = useEditorStore((s) => s.setTeleportMode)
  const ghostRef = useRef<THREE.Mesh>(null!)
  const { gl, camera } = useThree()

  useEffect(() => {
    if (!teleportMode) {
      _hitPos.current = null
      return
    }

    const el = gl.domElement

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      _raycaster.setFromCamera(_mouse, camera)
      const scenes = testMapScene.current
      if (!scenes.length) return
      const hits = _raycaster.intersectObjects(scenes, true)
      _hitPos.current = hits.length > 0 ? hits[0].point.clone() : null
    }

    const onClick = (e: MouseEvent) => {
      if (!_hitPos.current) return
      e.stopPropagation()
      teleportTarget.current = { x: _hitPos.current.x, y: _hitPos.current.y, z: _hitPos.current.z }
      setTeleportMode(false)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('click', onClick)
    }
  }, [teleportMode, gl, camera, setTeleportMode])

  useFrame(() => {
    if (!ghostRef.current) return
    if (!teleportMode || !_hitPos.current) {
      ghostRef.current.visible = false
      return
    }
    ghostRef.current.visible = true
    ghostRef.current.position.set(_hitPos.current.x, _hitPos.current.y + 0.6, _hitPos.current.z)
  })

  return (
    <mesh ref={ghostRef} visible={false}>
      <capsuleGeometry args={[0.3, 1, 4, 8]} />
      <meshBasicMaterial color="#00ff88" wireframe />
    </mesh>
  )
}
