'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapBarrierStore, BarrierWall } from '@/stores/mapBarrierStore'
import { getWallColor } from '@/components/canvas/MapBarrierEditor'

export function MapBarriersSidebar() {
  const active = useMapBarrierStore((s) => s.active)
  const walls = useMapBarrierStore((s) => s.walls)
  const drawingPoints = useMapBarrierStore((s) => s.drawingPoints)
  const isAddingWall = useMapBarrierStore((s) => s.isAddingWall)
  const selectedWallId = useMapBarrierStore((s) => s.selectedWallId)
  const finishWall = useMapBarrierStore((s) => s.finishWall)
  const cancelDrawing = useMapBarrierStore((s) => s.cancelDrawing)
  const deleteWall = useMapBarrierStore((s) => s.deleteWall)
  const selectWall = useMapBarrierStore((s) => s.selectWall)
  const startNewWall = useMapBarrierStore((s) => s.startNewWall)
  const continueWall = useMapBarrierStore((s) => s.continueWall)
  const updateWallWidth = useMapBarrierStore((s) => s.updateWallWidth)
  const updateWallBounds = useMapBarrierStore((s) => s.updateWallBounds)
  const setActive = useMapBarrierStore((s) => s.setActive)
  const minY = useMapBarrierStore((s) => s.minY)
  const maxY = useMapBarrierStore((s) => s.maxY)
  const width = useMapBarrierStore((s) => s.width)
  const setMinY = useMapBarrierStore((s) => s.setMinY)
  const setMaxY = useMapBarrierStore((s) => s.setMaxY)
  const setWidth = useMapBarrierStore((s) => s.setWidth)

  const isDrawing = drawingPoints.length > 0 || isAddingWall
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedItemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedWallId])

  const handleSaveToProject = async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/barriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walls),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('ok')
    } catch {
      setSaveStatus('err')
    }
    setTimeout(() => setSaveStatus('idle'), 2500)
  }

  const handleExport = () => {
    const json = JSON.stringify(walls, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `map-barriers-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as BarrierWall[]
        if (!Array.isArray(imported)) throw new Error()
        // Merge: add imported walls that don't already exist by id
        const existing = useMapBarrierStore.getState().walls
        const existingIds = new Set(existing.map((w) => w.id))
        const toAdd = imported.filter((w) => !existingIds.has(w.id))
        const merged = [...existing, ...toAdd]
        useMapBarrierStore.setState({ walls: merged })
        localStorage.setItem('map-barriers', JSON.stringify(merged))
        setImportStatus('ok')
        setTimeout(() => setImportStatus('idle'), 2000)
      } catch {
        setImportStatus('err')
        setTimeout(() => setImportStatus('idle'), 2000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClose = () => {
    cancelDrawing()
    setActive(false)
    selectWall(null)
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="barriers-sidebar"
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          className="pointer-events-auto absolute left-0 top-0 bottom-0 flex flex-col overflow-hidden"
          style={{
            width: 260,
            background: 'linear-gradient(180deg, rgba(22,14,5,0.97) 0%, rgba(14,9,3,0.98) 100%)',
            borderRight: '1px solid rgba(160,110,40,0.3)',
            boxShadow: '6px 0 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3.5 shrink-0"
            style={{
              background: 'linear-gradient(180deg, rgba(40,25,8,0.9) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(160,110,40,0.2)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧱</span>
              <div>
                <div className="font-bold text-[13px] tracking-wide" style={{ color: 'rgb(253,224,71)' }}>
                  Murs de collision
                </div>
                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {walls.length} mur{walls.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[13px] transition-all"
              style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Default settings for new walls ── */}
          <div className="px-3 py-2.5 shrink-0 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Défauts nouveaux murs</div>
            {([
              { label: 'Bas', value: minY, set: setMinY, min: -100, max: 100, step: 0.5 },
              { label: 'Haut', value: maxY, set: setMaxY, min: -100, max: 100, step: 0.5 },
              { label: 'Épaisseur', value: width, set: setWidth, min: 0.1, max: 3, step: 0.1 },
            ] as const).map(({ label, value, set, min, max, step }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] w-14 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                <input
                  type="range" min={min} max={max} step={step} value={value}
                  onChange={(e) => set(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-yellow-400"
                />
                <span className="text-[10px] w-8 text-right font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{value.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* ── Actions ── */}
          <div className="px-3 py-2.5 shrink-0 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {!isDrawing ? (
              <button
                onClick={startNewWall}
                className="w-full rounded-xl py-2 text-[11px] font-bold tracking-wide"
                style={{
                  background: 'linear-gradient(180deg, rgba(99,179,237,0.18) 0%, rgba(66,153,225,0.1) 100%)',
                  border: '1px solid rgba(99,179,237,0.4)',
                  color: 'rgb(190,227,248)',
                  cursor: 'pointer',
                }}
              >
                + Nouveau mur
              </button>
            ) : (
              <div
                className="rounded-xl px-3 py-2 text-[11px] text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(180,130,40,0.06) 100%)',
                  border: '1px solid rgba(251,191,36,0.2)',
                  color: 'rgb(253,224,71)',
                }}
              >
                {drawingPoints.length === 0
                  ? 'Cliquez sur le terrain pour placer des points'
                  : `En cours — ${drawingPoints.length} point${drawingPoints.length !== 1 ? 's' : ''}`}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={finishWall}
                disabled={drawingPoints.length < 2}
                className="flex-1 rounded-xl py-2 text-[11px] font-bold tracking-wide transition-all"
                style={{
                  background: drawingPoints.length >= 2 ? 'linear-gradient(180deg, rgba(74,222,128,0.2) 0%, rgba(34,197,94,0.12) 100%)' : 'rgba(255,255,255,0.03)',
                  border: drawingPoints.length >= 2 ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  color: drawingPoints.length >= 2 ? 'rgb(134,239,172)' : 'rgba(255,255,255,0.2)',
                  cursor: drawingPoints.length >= 2 ? 'pointer' : 'not-allowed',
                }}
              >
                ✓ Terminer
              </button>
              <button
                onClick={cancelDrawing}
                disabled={!isDrawing}
                className="flex-1 rounded-xl py-2 text-[11px] font-medium tracking-wide transition-all"
                style={{
                  background: isDrawing ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)',
                  border: isDrawing ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  color: isDrawing ? 'rgb(252,165,165)' : 'rgba(255,255,255,0.2)',
                  cursor: isDrawing ? 'pointer' : 'not-allowed',
                }}
              >
                ✕ Annuler
              </button>
            </div>
          </div>

          {/* ── Hint ── */}
          <div className="px-3 pt-1 pb-0 shrink-0">
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Entrée = terminer · Échap = annuler · Dbl-clic = terminer
            </div>
          </div>

          {/* ── Save to project ── */}
          <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleSaveToProject}
              disabled={walls.length === 0 || saveStatus === 'saving'}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold tracking-wide transition-all"
              style={{
                background: saveStatus === 'ok' ? 'rgba(74,222,128,0.15)' : saveStatus === 'err' ? 'rgba(248,113,113,0.15)' : walls.length > 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                border: saveStatus === 'ok' ? '1px solid rgba(74,222,128,0.4)' : saveStatus === 'err' ? '1px solid rgba(248,113,113,0.4)' : walls.length > 0 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: saveStatus === 'ok' ? 'rgb(134,239,172)' : saveStatus === 'err' ? 'rgb(252,165,165)' : walls.length > 0 ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.2)',
                cursor: walls.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {saveStatus === 'saving' ? '…' : saveStatus === 'ok' ? '✓ Sauvegardé dans le projet' : saveStatus === 'err' ? '✕ Erreur serveur' : '💾 Sauvegarder dans le projet'}
            </button>
          </div>

          {/* ── Export / Import JSON ── */}
          <div className="flex gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleExport}
              disabled={walls.length === 0}
              className="flex-1 rounded-lg py-1.5 text-[10px] font-medium tracking-wide transition-all"
              style={{
                background: walls.length > 0 ? 'rgba(99,179,237,0.12)' : 'rgba(255,255,255,0.03)',
                border: walls.length > 0 ? '1px solid rgba(99,179,237,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: walls.length > 0 ? 'rgb(190,227,248)' : 'rgba(255,255,255,0.2)',
                cursor: walls.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              ↓ Exporter JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-lg py-1.5 text-[10px] font-medium tracking-wide transition-all"
              style={{
                background: importStatus === 'ok' ? 'rgba(74,222,128,0.15)' : importStatus === 'err' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
                border: importStatus === 'ok' ? '1px solid rgba(74,222,128,0.35)' : importStatus === 'err' ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(255,255,255,0.1)',
                color: importStatus === 'ok' ? 'rgb(134,239,172)' : importStatus === 'err' ? 'rgb(252,165,165)' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              {importStatus === 'ok' ? '✓ Importé' : importStatus === 'err' ? '✕ Erreur' : '↑ Importer JSON'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          {/* ── Wall list ── */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(160,110,40,0.3) transparent' }}
          >
            {walls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="text-3xl opacity-20">🧱</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Aucun mur placé
                </span>
              </div>
            ) : (
              walls.map((wall, idx) => {
                const isSelected = wall.id === selectedWallId
                const color = getWallColor(wall.id)
                return (
                  <motion.div
                    key={wall.id}
                    layout
                    ref={isSelected ? (el) => { selectedItemRef.current = el } : undefined}
                    onClick={() => selectWall(isSelected ? null : wall.id)}
                    className="cursor-pointer rounded-xl overflow-hidden transition-all duration-150"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(180,130,40,0.08) 100%)'
                        : 'rgba(255,255,255,0.04)',
                      border: isSelected ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="px-3 py-2.5 space-y-2">
                      {/* Name + segment count */}
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span
                          className="text-[12px] font-semibold flex-1"
                          style={{ color: isSelected ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.75)' }}
                        >
                          Mur {idx + 1}
                        </span>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: 'rgba(255,255,255,0.28)' }}
                        >
                          {wall.points.length - 1} seg · {wall.points.length} pts
                        </span>
                      </div>

                      {/* Per-wall sliders — always visible */}
                      <div onClick={(e) => e.stopPropagation()} className="space-y-1">
                        {([
                          { label: 'Bas', value: wall.minY, min: -100, max: 100, step: 0.5, onChange: (v: number) => updateWallBounds(wall.id, v, wall.maxY) },
                          { label: 'Haut', value: wall.maxY, min: -100, max: 100, step: 0.5, onChange: (v: number) => updateWallBounds(wall.id, wall.minY, v) },
                          { label: 'Épais.', value: wall.width, min: 0.1, max: 3, step: 0.1, onChange: (v: number) => updateWallWidth(wall.id, v) },
                        ]).map(({ label, value, min, max, step, onChange }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-[10px] w-8 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                            <input
                              type="range" min={min} max={max} step={step} value={value}
                              onChange={(e) => onChange(parseFloat(e.target.value))}
                              className="flex-1 accent-amber-400" style={{ height: 4 }}
                            />
                            <span className="text-[10px] w-8 text-right font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{value.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Delete — visible when selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div onClick={(e) => e.stopPropagation()} className="pt-1 flex flex-col gap-1.5">
                              <button
                                onClick={() => { deleteWall(wall.id); selectWall(null) }}
                                className="w-full rounded-lg py-1.5 text-[11px] font-medium transition-all"
                                style={{
                                  background: 'rgba(248,113,113,0.1)',
                                  border: '1px solid rgba(248,113,113,0.2)',
                                  color: 'rgb(252,165,165)',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.22)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                              >
                                ✕ Supprimer ce mur
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
