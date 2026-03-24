'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { propRegistry, type PropInfo } from '@/lib/testMapRef'
import { useCollisionStore } from '@/stores/collisionStore'
import { renderObjectThumbnail } from '@/lib/thumbnailRenderer'

const PLAYER_HEIGHT = 1.8

function getSizeBadge(height: number): { label: string; color: string; bg: string } {
  const ratio = height / PLAYER_HEIGHT
  const label = `×${ratio < 0.1 ? ratio.toFixed(2) : ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}`
  if (ratio < 0.3) return { label, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
  if (ratio > 1.5) return { label, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
  return { label, color: '#facc15', bg: 'rgba(250,204,21,0.15)' }
}

interface CardProps {
  info: PropInfo
  enabled: boolean
  thumb: string | null
  onToggle: () => void
}

function PropCard({ info, enabled, thumb, onToggle }: CardProps) {
  const badge = getSizeBadge(info.height)

  return (
    <button
      onClick={onToggle}
      title={`${info.baseName} — ${badge.label} taille joueur`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 6px 6px',
        borderRadius: 12,
        border: `1px solid ${enabled ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.07)'}`,
        background: enabled ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
        width: 112,
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
        flexShrink: 0,
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 96, height: 96,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {thumb && thumb.length > 10 ? (
          <img src={thumb} width={96} height={96} alt={info.baseName} style={{ display: 'block' }} />
        ) : thumb === '' ? (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>no preview</span>
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.8s linear infinite' }} />
        )}
      </div>

      {/* Name */}
      <span style={{
        fontSize: 9,
        color: enabled ? 'rgba(253,224,71,0.9)' : 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: 100,
        wordBreak: 'break-all',
        fontWeight: 500,
      }}>
        {info.baseName}
      </span>

      {/* Size badge — top right */}
      <div style={{
        position: 'absolute', top: 5, right: 5,
        padding: '1px 4px',
        borderRadius: 4,
        fontSize: 8, fontWeight: 700,
        color: badge.color,
        background: badge.bg,
        border: `1px solid ${badge.color}55`,
        lineHeight: 1.4,
      }}>
        {badge.label}
      </div>

      {/* Collision dot — top left */}
      <div style={{
        position: 'absolute', top: 6, left: 6,
        width: 7, height: 7,
        borderRadius: '50%',
        background: enabled ? '#22c55e' : 'rgba(255,255,255,0.12)',
        boxShadow: enabled ? '0 0 6px #22c55e88' : 'none',
        transition: 'background 0.12s',
      }} />
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CollisionManager({ open, onClose }: Props) {
  const { enabledNames, toggle, disableAll } = useCollisionStore()
  const [filter, setFilter] = useState('')
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())
  const renderingRef = useRef(false)

  // Render thumbnails progressively when modal opens
  useEffect(() => {
    if (!open || renderingRef.current) return
    renderingRef.current = true

    async function renderAll() {
      for (const info of propRegistry.detailmisc) {
        if (thumbs.has(info.baseName)) continue
        await new Promise<void>((r) => setTimeout(r, 0))
        try {
          const url = renderObjectThumbnail(info.mesh)
          setThumbs((prev) => {
            const next = new Map(prev)
            next.set(info.baseName, url)
            return next
          })
        } catch { /* ignore */ }
      }
      renderingRef.current = false
    }

    renderAll()
  }, [open])

  const enableAll = useCallback(() => {
    const { enabledNames: cur, toggle: tog } = useCollisionStore.getState()
    for (const info of propRegistry.detailmisc) {
      if (!cur.has(info.baseName)) tog(info.baseName)
    }
  }, [])

  const props = filter
    ? propRegistry.detailmisc.filter((p) =>
        p.baseName.toLowerCase().includes(filter.toLowerCase()),
      )
    : propRegistry.detailmisc

  const enabledCount = propRegistry.detailmisc.filter((p) => enabledNames.has(p.baseName)).length
  const total = propRegistry.detailmisc.length

  const barStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(30,18,6,0.99) 0%, rgba(16,9,2,1) 100%)',
    border: '1px solid rgba(160,110,40,0.35)',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="collision-mgr"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(8,4,1,0.97)',
            pointerEvents: 'auto',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            ...barStyle,
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            borderRadius: 0,
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ color: 'rgb(253,224,71)', fontSize: 18, fontWeight: 700, margin: 0 }}>
                Gestionnaire de collision
              </h1>
              <div style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: 'rgba(34,197,94,0.14)', color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                {enabledCount} / {total} actifs
              </div>
              <div style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
              }}>
                detailmisc.glb
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="Filtrer les props…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, outline: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white', width: 200,
                }}
              />
              <button
                onClick={enableAll}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                Tout activer
              </button>
              <button
                onClick={disableAll}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                Tout désactiver
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Fermer
              </button>
            </div>
          </div>

          {/* ── Legend ── */}
          <div style={{
            padding: '8px 24px',
            display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Taille vs joueur ({PLAYER_HEIGHT}u) :</span>
            {[
              { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: '< ×0.3 — micro' },
              { color: '#facc15', bg: 'rgba(250,204,21,0.15)', label: '×0.3 – ×1.5 — humain' },
              { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: '> ×1.5 — large' },
            ].map(({ color, bg, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, color, background: bg, border: `1px solid ${color}44` }}>A</div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              🟢 = collision active &nbsp;·&nbsp; clique pour toggle
            </span>
          </div>

          {/* ── Grid ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {props.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 80, color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                Aucun prop trouvé
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {props.map((info) => (
                  <PropCard
                    key={info.baseName}
                    info={info}
                    enabled={enabledNames.has(info.baseName)}
                    thumb={thumbs.get(info.baseName) ?? null}
                    onToggle={() => toggle(info.baseName)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            ...barStyle,
            borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
            borderRadius: 0,
            padding: '8px 24px',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              setdress.glb — collision BVH globale (toujours actif, géré séparément)
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
