'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMapBarrierStore } from '@/stores/mapBarrierStore'
import { hitboxMap, registerHitbox, unregisterHitbox } from '@/lib/hitboxes'
import { testMapScene } from '@/lib/testMapRef'

const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()

const _hover = {
  point: null as THREE.Vector3 | null,
  snapPoint: null as { wallId: string; pointIndex: number; x: number; z: number; isEnd: boolean } | null,
}

const SNAP_DIST = 0.6 // world units to detect existing point hover

// Stable color per wall derived from its ID
export function getWallColor(wallId: string): string {
  let h = 0
  for (const c of wallId) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return `hsl(${Math.abs(h) % 360}, 75%, 62%)`
}

// ── Wireframe segment mesh helper ────────────────────────────────────────────

function SegmentMesh({
  ax, az, bx, bz, wallWidth, color, minY, maxY, opacity = 0.8, xray = false, onClick,
}: {
  ax: number; az: number; bx: number; bz: number
  wallWidth: number; color: string; minY: number; maxY: number
  opacity?: number; xray?: boolean; onClick?: () => void
}) {
  const dx = bx - ax
  const dz = bz - az
  const length = Math.sqrt(dx * dx + dz * dz)
  if (length < 0.01) return null
  const cx = (ax + bx) / 2
  const cz = (az + bz) / 2
  const rotY = Math.atan2(dx, dz)
  const wallH = maxY - minY
  const midY = minY + wallH / 2

  return (
    <mesh
      position={[cx, midY, cz]}
      rotation={[0, rotY, 0]}
      renderOrder={999}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
    >
      <boxGeometry args={[wallWidth, wallH, length]} />
      <meshBasicMaterial
        color={color}
        wireframe={true}
        transparent={true}
        opacity={opacity}
        depthTest={!xray}
      />
    </mesh>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MapBarrierEditor() {
  const { gl, camera } = useThree()
  const walls = useMapBarrierStore((s) => s.walls)
  const active = useMapBarrierStore((s) => s.active)
  const drawingPoints = useMapBarrierStore((s) => s.drawingPoints)
  const selectedWallId = useMapBarrierStore((s) => s.selectedWallId)
  const addPoint = useMapBarrierStore((s) => s.addPoint)
  const finishWall = useMapBarrierStore((s) => s.finishWall)
  const cancelDrawing = useMapBarrierStore((s) => s.cancelDrawing)
  const removeLastPoint = useMapBarrierStore((s) => s.removeLastPoint)
  const updatePoint = useMapBarrierStore((s) => s.updatePoint)
  const continueWall = useMapBarrierStore((s) => s.continueWall)
  const selectWall = useMapBarrierStore((s) => s.selectWall)
  const minY = useMapBarrierStore((s) => s.minY)
  const maxY = useMapBarrierStore((s) => s.maxY)
  const width = useMapBarrierStore((s) => s.width)

  // Cursor preview sphere ref
  const sphereRef = useRef<THREE.Mesh>(null)
  // Hover snap indicator ref
  const hoverSnapRef = useRef<THREE.Mesh>(null)
  const hoverSnapMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // ── Collision registration ────────────────────────────────────────────────
  useEffect(() => {
    // Unregister all barrier hitboxes
    for (const id in hitboxMap) {
      if (id.startsWith('barrier_')) {
        unregisterHitbox(id)
      }
    }

    // Re-register from current walls
    for (const wall of walls) {
      for (let i = 0; i < wall.points.length - 1; i++) {
        const A = wall.points[i]
        const B = wall.points[i + 1]
        const dx = B.x - A.x
        const dz = B.z - A.z
        const length = Math.sqrt(dx * dx + dz * dz)
        if (length < 0.01) continue
        const cx = (A.x + B.x) / 2
        const cz = (A.z + B.z) / 2
        const rotY = Math.atan2(dx, dz)
        const halfLen = length / 2
        const halfW = wall.width / 2
        const id = `barrier_${wall.id}_${i}`
        registerHitbox(id, cx, cz, halfW, halfLen, wall.maxY, false, wall.minY, undefined, rotY)
      }
    }
  }, [walls])

  // ── Mouse tracking + click/drag handling ─────────────────────────────────
  const draggingRef = useRef<{ wallId: string; pointIndex: number } | null>(null)
  const pointerDownPos = useRef<{ x: number; y: number; snapPoint: typeof _hover.snapPoint } | null>(null)

  useEffect(() => {
    if (!active) {
      _hover.point = null
      _hover.snapPoint = null
      return
    }

    const el = gl.domElement

    const getHitPoint = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      _raycaster.setFromCamera(_mouse, camera)
      _raycaster.far = 500
      const hits = _raycaster.intersectObjects(testMapScene.current, true)
      return hits.length > 0 ? hits[0].point : null
    }

    const findNearestPoint = (x: number, z: number) => {
      const walls = useMapBarrierStore.getState().walls
      let best: { wallId: string; pointIndex: number; x: number; z: number; isEnd: boolean } | null = null
      let bestDist = SNAP_DIST
      for (const wall of walls) {
        for (let i = 0; i < wall.points.length; i++) {
          const p = wall.points[i]
          const d = Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2)
          if (d < bestDist) {
            bestDist = d
            best = { wallId: wall.id, pointIndex: i, x: p.x, z: p.z, isEnd: i === 0 || i === wall.points.length - 1 }
          }
        }
      }
      return best
    }

    const onMove = (e: MouseEvent) => {
      const hit = getHitPoint(e)
      _hover.point = hit ? hit.clone() : null
      if (draggingRef.current && hit) {
        // Live update while dragging
        const { wallId, pointIndex } = draggingRef.current
        updatePoint(wallId, pointIndex, hit.x, hit.z)
        _hover.snapPoint = null
      } else if (hit) {
        _hover.snapPoint = findNearestPoint(hit.x, hit.z)
      }
    }

    let lastClickTime = 0
    const DBLCLICK_MS = 300

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!_hover.point) return
      // If hovering an existing point → start drag (or click to continue if endpoint)
      if (_hover.snapPoint) {
        pointerDownPos.current = { x: e.clientX, y: e.clientY, snapPoint: _hover.snapPoint }
        draggingRef.current = { wallId: _hover.snapPoint.wallId, pointIndex: _hover.snapPoint.pointIndex }
        el.setPointerCapture(e.pointerId)
        return
      }
      // Only place new points if actively drawing (isAddingWall or already has points)
      const state = useMapBarrierStore.getState()
      if (!state.isAddingWall && state.drawingPoints.length === 0) return
      // Double-click to finish
      const now = Date.now()
      if (now - lastClickTime < DBLCLICK_MS) {
        finishWall(); lastClickTime = 0; return
      }
      lastClickTime = now
      addPoint(_hover.point.x, _hover.point.z)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (draggingRef.current) {
        // Detect click vs drag
        if (pointerDownPos.current) {
          const dx = e.clientX - pointerDownPos.current.x
          const dy = e.clientY - pointerDownPos.current.y
          const moved = Math.sqrt(dx * dx + dy * dy)
          // Click (barely moved) on a wall endpoint AND not currently drawing → continue that wall
          const isDrawing = useMapBarrierStore.getState().drawingPoints.length > 0
          if (moved < 5 && pointerDownPos.current.snapPoint?.isEnd && !isDrawing) {
            const { wallId, pointIndex } = draggingRef.current
            const reverse = pointIndex === 0
            useMapBarrierStore.getState().continueWall(wallId, reverse)
          }
          pointerDownPos.current = null
        }
        el.releasePointerCapture(e.pointerId)
        draggingRef.current = null
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') finishWall()
      if (e.key === 'Escape') cancelDrawing()
      if (e.key === 'Backspace') removeLastPoint()
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKey)

    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKey)
      _hover.point = null
      _hover.snapPoint = null
    }
  }, [active, gl, camera, addPoint, finishWall, cancelDrawing, removeLastPoint, updatePoint, continueWall])

  // ── Animate cursor sphere + hover snap indicator ──────────────────────────
  useFrame(() => {
    const mesh = sphereRef.current
    if (mesh) {
      if (!active || !_hover.point) {
        mesh.visible = false
      } else {
        mesh.visible = !_hover.snapPoint && !draggingRef.current
        mesh.position.set(_hover.point.x, _hover.point.y + 0.15, _hover.point.z)
      }
    }

    const snap = hoverSnapRef.current
    if (snap) {
      const sp = _hover.snapPoint
      if (!active || !sp) {
        snap.visible = false
      } else {
        snap.visible = true
        snap.position.set(sp.x, 0.5, sp.z)
        // Green = endpoint (can continue), white = mid-point (drag only)
        if (hoverSnapMatRef.current) {
          hoverSnapMatRef.current.color.set(sp.isEnd ? '#44ff88' : '#ffffff')
        }
      }
    }
  })

  if (!active) return null

  return (
    <>
      {/* Cursor preview sphere */}
      <mesh ref={sphereRef} visible={false} renderOrder={999}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshBasicMaterial color="#ff2222" depthTest={false} transparent opacity={0.9} />
      </mesh>

      {/* Hover snap indicator — white=drag, green=endpoint (continue wall) */}
      <mesh ref={hoverSnapRef} visible={false} renderOrder={1000}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial ref={hoverSnapMatRef} color="#ffffff" depthTest={false} transparent opacity={0.85} />
      </mesh>

      {/* Saved walls */}
      {walls.map((wall) => {
        const isSelected = wall.id === selectedWallId
        const baseColor = getWallColor(wall.id)
        const color = isSelected ? '#ff8800' : baseColor
        const opacity = isSelected ? 0.7 : 0.2
        return wall.points.map((p, i) => {
          const next = wall.points[i + 1]
          return (
            <group key={`${wall.id}_${i}`}>
              {/* Anchor sphere */}
              <mesh
                position={[p.x, 0.5, p.z]}
                onClick={(e) => { e.stopPropagation(); selectWall(isSelected ? null : wall.id) }}
              >
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={!active} />
              </mesh>
              {/* Segment box */}
              {next && (
                <SegmentMesh
                  ax={p.x} az={p.z}
                  bx={next.x} bz={next.z}
                  wallWidth={wall.width}
                  color={color}
                  minY={wall.minY} maxY={wall.maxY}
                  opacity={opacity}
                  xray={active}
                  onClick={() => selectWall(isSelected ? null : wall.id)}
                />
              )}
            </group>
          )
        })
      })}

      {/* Current drawing in progress */}
      {active && drawingPoints.map((p, i) => {
        const next = drawingPoints[i + 1]
        return (
          <group key={`drawing_${i}`}>
            <mesh position={[p.x, 0.5, p.z]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            {next && (
              <SegmentMesh
                ax={p.x} az={p.z}
                bx={next.x} bz={next.z}
                wallWidth={width}
                color="#ff6666"
                minY={minY} maxY={maxY}
              />
            )}
          </group>
        )
      })}

      {/* Preview segment from last placed point to mouse cursor */}
      <PreviewSegment drawingPoints={drawingPoints} active={active} minY={minY} maxY={maxY} width={width} />
    </>
  )
}

// ── Preview segment to cursor (updates every frame) ──────────────────────────

function PreviewSegment({
  drawingPoints, active, minY, maxY, width,
}: {
  drawingPoints: { x: number; z: number }[]
  active: boolean; minY: number; maxY: number; width: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wallH = maxY - minY
  const midY = minY + wallH / 2

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    if (!active || drawingPoints.length === 0 || !_hover.point) {
      mesh.visible = false
      return
    }

    const last = drawingPoints[drawingPoints.length - 1]
    const dx = _hover.point.x - last.x
    const dz = _hover.point.z - last.z
    const length = Math.sqrt(dx * dx + dz * dz)
    if (length < 0.01) { mesh.visible = false; return }

    const cx = (last.x + _hover.point.x) / 2
    const cz = (last.z + _hover.point.z) / 2
    const rotY = Math.atan2(dx, dz)

    mesh.visible = true
    mesh.position.set(cx, midY, cz)
    mesh.rotation.set(0, rotY, 0)
    mesh.scale.set(1, 1, length)
  })

  return (
    <mesh ref={meshRef} visible={false} renderOrder={999}>
      <boxGeometry args={[width, wallH, 1]} />
      <meshBasicMaterial color="#ffaa00" wireframe transparent opacity={0.5} depthTest={false} />
    </mesh>
  )
}
