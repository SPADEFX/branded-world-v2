'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { playerPosition, isIndoorsRef } from '@/lib/playerRef'
import { useEditorStore } from '@/stores/editorStore'
import { testMapScene } from '@/lib/testMapRef'
import type { DoorTrigger } from '@/config/indoorZones'

// ─── Visual constants ────────────────────────────────────────────
const DOOR_W = 2.0
const DOOR_H = 2.5
const ROT_SNAP = Math.PI / 12 // 15° per arrow button

// Shared edge geometry (created once, reused by every door mesh)
const _edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.04))

// ─── Module-level transform state ───────────────────────────────
// Updated every frame by DoorTransformController, read by DoorMesh.useFrame
const _preview = { id: null as string | null, x: 0, y: 0, z: 0, nx: 0, nz: 0, radius: 1.2 }
const _xform = {
  mode: null as 'grab' | 'rotate' | 'scale' | null,
  axis: null as 'x' | 'z' | null,
  startNDC: { x: 0, y: 0 },
  origX: 0, origZ: 0, origRotY: 0, origRadius: 0,
}
const _mouseNDC = new THREE.Vector2()
const _raycaster = new THREE.Raycaster()

function cancelXform() {
  _preview.id = null
  _xform.mode = null
  _xform.axis = null
}

// ─── Per-door 3D rectangle ───────────────────────────────────────
function DoorMesh({
  door,
  isSelected,
  transformMode,
  onSelect,
  onFlip,
  onDelete,
  onRotateSnap,
}: {
  door: DoorTrigger
  isSelected: boolean
  transformMode: 'grab' | 'rotate' | 'scale' | null
  onSelect: () => void
  onFlip: () => void
  onDelete: () => void
  onRotateSnap: (delta: number) => void
}) {
  const groupRef = useRef<THREE.Group>(null!)
  // Keep a fresh ref so useFrame closure doesn't go stale
  const doorRef = useRef(door)
  doorRef.current = door

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    // If this door has an active preview, use preview data (real-time); else use store data
    const src = _preview.id === door.id && _xform.mode ? _preview : doorRef.current
    g.position.set(src.x, (src as typeof _preview).y ?? 0, src.z)
    g.rotation.y = Math.atan2(src.nx, src.nz)
  })

  const modeLabel = transformMode === 'grab' ? 'G·GRAB' : transformMode === 'rotate' ? 'R·ROTATE' : transformMode === 'scale' ? 'S·SCALE' : null

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); if (!_xform.mode) onSelect() }}>
      {/* Green face — entry (local +Z = inward) */}
      <mesh position={[0, DOOR_H / 2, 0.01]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={isSelected ? 0.82 : 0.6} side={THREE.FrontSide} />
      </mesh>

      {/* Red face — exit (local −Z = outward) */}
      <mesh position={[0, DOOR_H / 2, -0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={isSelected ? 0.82 : 0.6} side={THREE.FrontSide} />
      </mesh>

      {/* White outline */}
      <lineSegments geometry={_edgeGeo} position={[0, DOOR_H / 2, 0]}>
        <lineBasicMaterial color="white" transparent opacity={isSelected ? 0.85 : 0.4} />
      </lineSegments>

      {/* Trigger radius ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[door.radius - 0.07, door.radius, 32]} />
        <meshBasicMaterial color={isSelected ? '#4ade80' : '#22c55e'} transparent opacity={isSelected ? 0.65 : 0.35} />
      </mesh>

      {/* Floating toolbox — only when selected */}
      {isSelected && (
        <Html position={[0, DOOR_H + 0.9, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{ pointerEvents: 'auto', whiteSpace: 'nowrap', userSelect: 'none' }}
            className="flex flex-col items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Active mode indicator */}
            {modeLabel && (
              <div className="rounded-full bg-amber-500/30 px-3 py-0.5 text-[10px] font-mono text-amber-300 ring-1 ring-amber-400/40">
                {modeLabel} — clic pour confirmer · Esc pour annuler
              </div>
            )}

            {/* Main toolbar */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-900/90 backdrop-blur px-2 py-1.5 text-xs text-white shadow-xl ring-1 ring-white/10">
              {/* Snap rotate */}
              <button
                onClick={() => onRotateSnap(-ROT_SNAP)}
                title="−15°"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-base font-mono"
              >←</button>
              <button
                onClick={() => onRotateSnap(ROT_SNAP)}
                title="+15°"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-base font-mono"
              >→</button>

              <span className="w-px h-4 bg-white/20 block mx-0.5" />

              {/* G / R / S modal */}
              {([['G', 'grab', 'Déplacer (G)'], ['R', 'rotate', 'Tourner (R)'], ['S', 'scale', 'Scale (S)']] as const).map(([label, m, title]) => (
                <button
                  key={m}
                  title={title}
                  onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: label, bubbles: true }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg font-mono font-bold transition-colors ${
                    transformMode === m
                      ? 'bg-amber-500/40 text-amber-200 ring-1 ring-amber-400/50'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >{label}</button>
              ))}

              <span className="w-px h-4 bg-white/20 block mx-0.5" />

              <button onClick={onFlip} title="Flip" className="px-1.5 py-1 rounded-lg text-sky-300 hover:bg-white/10 hover:text-sky-100 transition-colors">↔</button>

              <span className="w-px h-4 bg-white/20 block mx-0.5" />

              <span className="font-mono text-amber-300 font-medium px-1 text-[11px]">
                {door.name || '#' + door.id.replace('door_', '').slice(-6)}
              </span>

              <span className="w-px h-4 bg-white/20 block mx-0.5" />

              <button onClick={onDelete} title="Supprimer" className="px-1.5 py-1 rounded-lg text-red-300 hover:bg-red-500/20 hover:text-white transition-colors">✕</button>
            </div>

            {/* Axis hint when in grab mode */}
            {transformMode === 'grab' && (
              <div className="text-[10px] text-white/50 font-mono">
                X = axe X · Z = axe Z · G = libre
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// ─── G/R/S keyboard + mouse transform controller ─────────────────
function DoorTransformController() {
  const { gl } = useThree()
  const enabled = useEditorStore((s) => s.enabled)
  const updateDoor = useEditorStore((s) => s.updateDoor)
  const setDoorTransformMode = useEditorStore((s) => s.setDoorTransformMode)

  useFrame(({ camera }) => {
    if (!_xform.mode || !_preview.id) return

    if (_xform.mode === 'grab') {
      _raycaster.setFromCamera(_mouseNDC, camera)
      const hits = _raycaster.intersectObjects(testMapScene.current, true)
      if (hits.length > 0) {
        const pt = hits[0].point
        if (_xform.axis === 'x') _preview.x = pt.x
        else if (_xform.axis === 'z') _preview.z = pt.z
        else _preview.x = pt.x, _preview.z = pt.z
        _preview.y = pt.y  // always follow actual terrain height
      }
    } else if (_xform.mode === 'rotate') {
      const rotY = _xform.origRotY + (_mouseNDC.x - _xform.startNDC.x) * Math.PI * 2
      _preview.nx = parseFloat(Math.sin(rotY).toFixed(3))
      _preview.nz = parseFloat(Math.cos(rotY).toFixed(3))
    } else if (_xform.mode === 'scale') {
      _preview.radius = Math.max(0.5, _xform.origRadius + (_mouseNDC.x - _xform.startNDC.x) * 4)
    }
  })

  useEffect(() => {
    if (!enabled) return

    const enterMode = (mode: 'grab' | 'rotate' | 'scale') => {
      const { selectedDoorId, placedDoors, placeDoorMode } = useEditorStore.getState()
      if (!selectedDoorId || placeDoorMode) return
      const door = placedDoors.find((d) => d.id === selectedDoorId)
      if (!door) return
      _xform.mode = mode
      _xform.axis = null
      _xform.startNDC = { x: _mouseNDC.x, y: _mouseNDC.y }
      _xform.origX = door.x; _xform.origZ = door.z
      _xform.origRotY = Math.atan2(door.nx, door.nz)
      _xform.origRadius = door.radius
      _preview.id = door.id
      _preview.x = door.x; _preview.y = 0; _preview.z = door.z
      _preview.nx = door.nx; _preview.nz = door.nz
      _preview.radius = door.radius
      setDoorTransformMode(mode)
    }

    const doCancel = () => {
      cancelXform()
      setDoorTransformMode(null)
    }

    const doConfirm = () => {
      if (!_xform.mode || !_preview.id) return
      const mode = _xform.mode
      const id = _preview.id
      const snap = { ..._preview }
      doCancel()
      if (mode === 'grab') updateDoor(id, { x: snap.x, y: snap.y, z: snap.z })
      else if (mode === 'rotate') updateDoor(id, { nx: snap.nx, nz: snap.nz })
      else if (mode === 'scale') updateDoor(id, { radius: snap.radius })
    }

    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return

      const key = e.key.toLowerCase()

      if (_xform.mode) {
        if (key === 'escape') { doCancel(); return }
        if (key === 'enter') { doConfirm(); return }
        if (_xform.mode === 'grab') {
          if (key === 'x') { _xform.axis = 'x'; return }
          if (key === 'z') { _xform.axis = 'z'; return }
          if (key === 'g') { _xform.axis = null; _xform.startNDC = { x: _mouseNDC.x, y: _mouseNDC.y }; return }
        }
        return
      }

      const { selectedDoorId, placeDoorMode } = useEditorStore.getState()
      if (!selectedDoorId || placeDoorMode) return
      if (key === 'g') enterMode('grab')
      else if (key === 'r') enterMode('rotate')
      else if (key === 's') enterMode('scale')
    }

    const onMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      _mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      _mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onClick = () => {
      if (_xform.mode) doConfirm()
    }

    window.addEventListener('keydown', onKey)
    gl.domElement.addEventListener('mousemove', onMove)
    gl.domElement.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      gl.domElement.removeEventListener('mousemove', onMove)
      gl.domElement.removeEventListener('click', onClick)
      doCancel()
    }
  }, [enabled, gl, updateDoor, setDoorTransformMode])

  return null
}

// ─── Main component ──────────────────────────────────────────────
export function DoorTriggers() {
  const enabled = useEditorStore((s) => s.enabled)
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)
  const placedDoors = useEditorStore((s) => s.placedDoors)
  const selectedDoorId = useEditorStore((s) => s.selectedDoorId)
  const doorTransformMode = useEditorStore((s) => s.doorTransformMode)
  const selectDoor = useEditorStore((s) => s.selectDoor)
  const flipDoor = useEditorStore((s) => s.flipDoor)
  const rotateDoor = useEditorStore((s) => s.rotateDoor)
  const removeDoor = useEditorStore((s) => s.removeDoor)

  // Gameplay: update isIndoorsRef every frame
  useFrame(() => {
    if (!placedDoors.length) return
    const px = playerPosition.x
    const pz = playerPosition.z
    for (const door of placedDoors) {
      const dx = px - door.x
      const dz = pz - door.z
      if (dx * dx + dz * dz < door.radius * door.radius) {
        isIndoorsRef.current = dx * door.nx + dz * door.nz > 0
      }
    }
  })

  const showVisuals = enabled || viewDoorsMode

  return (
    <>
      {enabled && <DoorTransformController />}
      {showVisuals && placedDoors.map((door) => {
        const sel = selectedDoorId === door.id
        return (
          <DoorMesh
            key={door.id}
            door={door}
            isSelected={sel}
            transformMode={sel ? doorTransformMode : null}
            onSelect={() => selectDoor(sel ? null : door.id)}
            onFlip={() => flipDoor(door.id)}
            onDelete={() => { removeDoor(door.id); selectDoor(null) }}
            onRotateSnap={(delta) => rotateDoor(door.id, delta)}
          />
        )
      })}
    </>
  )
}
