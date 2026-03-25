'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditorStore } from '@/stores/editorStore'
import { useCollisionStore } from '@/stores/collisionStore'
import { propRegistry, type PropCollection } from '@/lib/testMapRef'
import { propViewerFlyTo } from '@/lib/propViewerRef'

const PLAYER_HEIGHT = 1.8

const COLLECTIONS: { id: PropCollection; label: string }[] = [
  { id: 'detailmisc', label: 'Détail' },
  { id: 'misc',       label: 'Misc' },
  { id: 'setdress',   label: 'Intérieur' },
]

function getSizeBadge(height: number) {
  const ratio = height / PLAYER_HEIGHT
  const label = `×${ratio < 0.1 ? ratio.toFixed(2) : ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}`
  if (ratio < 0.3) return { label, color: '#ef4444' }
  if (ratio > 1.5) return { label, color: '#22c55e' }
  return { label, color: '#facc15' }
}

function NavBtn({
  label, onClick, disabled = false,
}: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 40, height: 40,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.06)',
        color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
        fontSize: 16, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  )
}

export function PropViewerHUD() {
  const propViewerOpen       = useEditorStore((s) => s.propViewerOpen)
  const propViewerIndex      = useEditorStore((s) => s.propViewerIndex)
  const propViewerCollection = useEditorStore((s) => s.propViewerCollection)
  const setPropViewerCollection = useEditorStore((s) => s.setPropViewerCollection)
  const { enabledNames, toggle, hiddenNames, toggleHidden } = useCollisionStore()

  const collectionProps = propRegistry[propViewerCollection]
  const total = collectionProps.length
  const info  = collectionProps[propViewerIndex]

  // Fixed width — computed from longest name in current collection, never changes while browsing
  const fixedWidth = collectionProps.length
    ? Math.max(240, Math.max(...collectionProps.map((p) => p.baseName.length)) * 7.6 + 64)
    : 260

  const navigate = useCallback((delta: number) => {
    if (!propViewerFlyTo.current || total === 0) return
    const next = Math.max(0, Math.min(total - 1, propViewerIndex + delta))
    if (next !== propViewerIndex) propViewerFlyTo.current(next)
  }, [propViewerIndex, total])

  const barStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(30,18,6,0.97) 0%, rgba(16,9,2,0.99) 100%)',
    border: '1px solid rgba(160,110,40,0.4)',
    borderRadius: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  }

  return (
    <AnimatePresence>
      {propViewerOpen && (
        <motion.div
          key="prop-viewer-hud"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 108,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Collection selector */}
          <div style={{ ...barStyle, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
            {COLLECTIONS.map((col) => {
              const active = propViewerCollection === col.id
              return (
                <button
                  key={col.id}
                  onClick={() => setPropViewerCollection(col.id)}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 8,
                    border: active ? '1px solid rgba(160,110,40,0.6)' : '1px solid transparent',
                    background: active ? 'rgba(160,110,40,0.18)' : 'transparent',
                    color: active ? 'rgba(255,200,80,0.95)' : 'rgba(255,255,255,0.35)',
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {col.label}
                </button>
              )
            })}
          </div>

          {/* Navigation row */}
          <div style={{ ...barStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>

            {/* ◀◀ -10 */}
            <NavBtn label="◀◀" onClick={() => navigate(-10)} disabled={propViewerIndex === 0} />
            {/* ◀ -1 */}
            <NavBtn label="◀" onClick={() => navigate(-1)} disabled={propViewerIndex === 0} />

            {/* Center info — fixed width based on longest name, no layout shift while navigating */}
            <div style={{ width: fixedWidth, textAlign: 'center', padding: '0 10px', flexShrink: 0 }}>
              {info ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {info.baseName}
                    </span>
                    {/* Size badge */}
                    {(() => {
                      const b = getSizeBadge(info.height)
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                          color: b.color, background: b.color + '22',
                          border: `1px solid ${b.color}44`,
                        }}>
                          {b.label}
                        </span>
                      )
                    })()}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {propViewerIndex + 1} / {total}
                    {info.instanceCount > 1 && (
                      <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.2)' }}>
                        {info.instanceCount}× instances
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Chargement…</span>
              )}
            </div>

            {/* ▶ +1 */}
            <NavBtn label="▶" onClick={() => navigate(1)} disabled={propViewerIndex >= total - 1} />
            {/* ▶▶ +10 */}
            <NavBtn label="▶▶" onClick={() => navigate(10)} disabled={propViewerIndex >= total - 1} />
          </div>

          {/* Action buttons row */}
          {info && (() => {
            const enabled = enabledNames.has(info.baseName)
            const hidden  = hiddenNames.has(info.baseName)
            return (
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Collision toggle */}
                <motion.button
                  key={`col-${info.baseName}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggle(info.baseName)}
                  style={{
                    ...barStyle,
                    padding: '9px 22px',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    color: enabled ? '#22c55e' : 'rgba(255,255,255,0.4)',
                    borderColor: enabled ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
                    background: enabled
                      ? 'linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(20,120,56,0.1) 100%)'
                      : 'linear-gradient(180deg, rgba(30,18,6,0.97) 0%, rgba(16,9,2,0.99) 100%)',
                    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                  }}
                >
                  {enabled ? '✓ Collision active' : 'Activer la collision'}
                </motion.button>

                {/* Hide toggle */}
                <motion.button
                  key={`hide-${info.baseName}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    toggleHidden(info.baseName)
                    info.sceneMesh.visible = hidden  // hidden=true → now showing → visible=true
                  }}
                  style={{
                    ...barStyle,
                    padding: '9px 22px',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    color: hidden ? '#ef4444' : 'rgba(255,255,255,0.4)',
                    borderColor: hidden ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                    background: hidden
                      ? 'linear-gradient(180deg, rgba(239,68,68,0.12) 0%, rgba(150,30,30,0.1) 100%)'
                      : 'linear-gradient(180deg, rgba(30,18,6,0.97) 0%, rgba(16,9,2,0.99) 100%)',
                    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                  }}
                >
                  {hidden ? '✗ Masqué' : 'Masquer'}
                </motion.button>
              </div>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
