'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playerPosition } from '@/lib/playerRef'
import { useMinimapStore } from '@/stores/minimapStore'
import { MINIMAP_WORLD, MINIMAP_SIZE, MINIMAP_ZONES, MINIMAP_FLIP_Z } from '@/config/minimapConfig'

/* ── Coordinate helpers ────────────────────────────────────── */

function worldToPixel(worldX: number, worldZ: number): { x: number; y: number } {
  const nx = (worldX - MINIMAP_WORLD.xMin) / (MINIMAP_WORLD.xMax - MINIMAP_WORLD.xMin)
  const nz = (worldZ - MINIMAP_WORLD.zMin) / (MINIMAP_WORLD.zMax - MINIMAP_WORLD.zMin)
  return {
    x: nx * MINIMAP_SIZE,
    y: (MINIMAP_FLIP_Z ? 1 - nz : nz) * MINIMAP_SIZE,
  }
}

/* ── Fog canvas builder ────────────────────────────────────── */

function buildFogCanvas(discoveredZones: string[]): HTMLCanvasElement {
  const fog = document.createElement('canvas')
  fog.width = MINIMAP_SIZE
  fog.height = MINIMAP_SIZE
  const ctx = fog.getContext('2d')!

  // Dark fog base
  ctx.fillStyle = 'rgba(4, 4, 14, 0.93)'
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

  // Punch out each discovered zone with a gradient ellipse
  ctx.globalCompositeOperation = 'destination-out'
  for (const zoneId of discoveredZones) {
    const zone = MINIMAP_ZONES.find((z) => z.id === zoneId)
    if (!zone) continue

    const tl = worldToPixel(zone.xMin, zone.zMin)
    const br = worldToPixel(zone.xMax, zone.zMax)
    const cx = (tl.x + br.x) / 2
    const cy = (tl.y + br.y) / 2
    const rx = Math.abs(br.x - tl.x) / 2
    const ry = Math.abs(br.y - tl.y) / 2
    const maxR = Math.max(rx, ry)

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.4)
    grad.addColorStop(0,    'rgba(0,0,0,1)')
    grad.addColorStop(0.6,  'rgba(0,0,0,0.95)')
    grad.addColorStop(0.85, 'rgba(0,0,0,0.5)')
    grad.addColorStop(1,    'rgba(0,0,0,0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  return fog
}

/* ── Component ─────────────────────────────────────────────── */

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgLoadedRef = useRef(false)
  const fogRef = useRef<HTMLCanvasElement | null>(null)

  const discoveredZones = useMinimapStore((s) => s.discoveredZones)
  const pendingNotification = useMinimapStore((s) => s.pendingNotification)
  const clearNotification = useMinimapStore((s) => s.clearNotification)

  // Load minimap image once
  useEffect(() => {
    const img = new Image()
    img.src = '/ui/minimap.png'
    img.onload = () => {
      imgRef.current = img
      imgLoadedRef.current = true
    }
    img.onerror = () => {
      imgLoadedRef.current = false
    }
  }, [])

  // Rebuild fog whenever discovered zones change
  useEffect(() => {
    fogRef.current = buildFogCanvas(discoveredZones)
  }, [discoveredZones])

  // Draw loop at 10 FPS (more than enough for a minimap)
  useEffect(() => {
    const id = setInterval(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

      // Base map image (or placeholder if not yet provided)
      if (imgRef.current && imgLoadedRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
      } else {
        // Placeholder: dark background with faint grid
        ctx.fillStyle = '#0c0f1a'
        ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'
        ctx.lineWidth = 1
        for (let i = 0; i <= MINIMAP_SIZE; i += 18) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MINIMAP_SIZE); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MINIMAP_SIZE, i); ctx.stroke()
        }
        // Placeholder text
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('minimap.png', MINIMAP_SIZE / 2, MINIMAP_SIZE / 2)
      }

      // Fog of war overlay
      if (fogRef.current) {
        ctx.drawImage(fogRef.current, 0, 0)
      }

      // Player dot
      const pp = worldToPixel(playerPosition.x, playerPosition.z)

      // Outer glow ring
      ctx.beginPath()
      ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(253,224,71,0.2)'
      ctx.fill()

      // Core dot
      ctx.beginPath()
      ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fde047'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      ctx.stroke()
    }, 100)
    return () => clearInterval(id)
  }, [])

  // Zone discovery check (runs every 500ms)
  useEffect(() => {
    const id = setInterval(() => {
      const { x, z } = playerPosition
      for (const zone of MINIMAP_ZONES) {
        if (useMinimapStore.getState().discoveredZones.includes(zone.id)) continue
        if (x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax) {
          useMinimapStore.getState().discoverZone(zone.id, zone.label)
          break // one discovery per tick
        }
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  // Auto-dismiss notification after 3 s
  useEffect(() => {
    if (!pendingNotification) return
    const id = setTimeout(clearNotification, 3000)
    return () => clearTimeout(id)
  }, [pendingNotification, clearNotification])

  return (
    <div className="pointer-events-none fixed bottom-28 right-5 z-30 flex flex-col items-end gap-2">

      {/* Zone-discovered toast */}
      <AnimatePresence>
        {pendingNotification && (
          <motion.div
            key={pendingNotification}
            initial={{ opacity: 0, x: 16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{    opacity: 0, x: 16, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(22,14,4,0.97) 0%, rgba(36,24,8,0.97) 100%)',
              border: '1px solid rgba(251,191,36,0.45)',
              color: 'rgb(253,224,71)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
              textShadow: '0 0 12px rgba(251,191,36,0.5)',
            }}
          >
            <span style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.7))' }}>🗺</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>Zone découverte :</span>
            <span>{pendingNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimap panel */}
      <div
        style={{
          width: MINIMAP_SIZE,
          height: MINIMAP_SIZE,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(160,110,40,0.45)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        <canvas ref={canvasRef} width={MINIMAP_SIZE} height={MINIMAP_SIZE} style={{ display: 'block' }} />
      </div>

      {/* Discovery counter */}
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: 'rgba(22,14,4,0.85)',
          border: '1px solid rgba(160,110,40,0.3)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <span style={{ color: 'rgb(253,224,71)' }}>{discoveredZones.length}</span>
        <span>/</span>
        <span>{MINIMAP_ZONES.length}</span>
        <span>zones</span>
      </div>

    </div>
  )
}
