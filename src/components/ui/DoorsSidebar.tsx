'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { exportDoorsToClipboard, type DoorTrigger } from '@/config/indoorZones'
import { freeCameraJumpTarget } from '@/lib/playerRef'
import { motion, AnimatePresence } from 'framer-motion'

function dirArrow(nx: number, nz: number) {
  const a = Math.atan2(nx, -nz)
  const idx = Math.round((a / (Math.PI * 2)) * 8 + 8) % 8
  return ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][idx]
}

function DoorRow({ door, isSelected, onRowClick }: {
  door: DoorTrigger
  isSelected: boolean
  onRowClick: () => void
}) {
  const renameDoor = useEditorStore((s) => s.renameDoor)
  const flipDoor = useEditorStore((s) => s.flipDoor)
  const removeDoor = useEditorStore((s) => s.removeDoor)
  const selectDoor = useEditorStore((s) => s.selectDoor)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValue(door.name || '')
    setEditing(true)
  }
  const saveEdit = () => {
    if (value.trim()) renameDoor(door.id, value.trim())
    setEditing(false)
  }

  const displayName = door.name || '#' + door.id.replace('door_', '').slice(-8)

  return (
    <motion.div
      layout
      onClick={onRowClick}
      className="cursor-pointer rounded-xl overflow-hidden transition-all duration-150"
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(180,130,40,0.08) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: isSelected
          ? '1px solid rgba(251,191,36,0.35)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="px-3 py-2.5 space-y-1.5">
        {/* Name */}
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent border-b text-[12px] outline-none font-medium"
            style={{ borderColor: 'rgba(251,191,36,0.6)', color: 'rgb(253,224,71)' }}
            placeholder="Nom de la porte..."
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span
              onClick={startEdit}
              title="Cliquer pour renommer"
              className="text-[12px] font-semibold truncate cursor-text transition-colors"
              style={{ color: isSelected ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.75)' }}
            >
              {displayName}
            </span>
            <span
              className="text-base shrink-0"
              title="Direction"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {dirArrow(door.nx, door.nz)}
            </span>
          </div>
        )}

        {/* Coords */}
        <div className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          x {door.x.toFixed(1)}  ·  z {door.z.toFixed(1)}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div
                className="flex gap-1.5 pt-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => flipDoor(door.id)}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(56,189,248,0.12)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    color: 'rgb(125,211,252)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56,189,248,0.22)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(56,189,248,0.12)')}
                >
                  ↔ Flip
                </button>
                <button
                  onClick={() => { removeDoor(door.id); selectDoor(null) }}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    color: 'rgb(252,165,165)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.22)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                >
                  ✕ Suppr.
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function DoorsSidebar() {
  const placeDoorMode = useEditorStore((s) => s.placeDoorMode)
  const setPlaceDoorMode = useEditorStore((s) => s.setPlaceDoorMode)
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)
  const setViewDoorsMode = useEditorStore((s) => s.setViewDoorsMode)
  const doorViewStyle = useEditorStore((s) => s.doorViewStyle)
  const setDoorViewStyle = useEditorStore((s) => s.setDoorViewStyle)
  const placedDoors = useEditorStore((s) => s.placedDoors)
  const selectedDoorId = useEditorStore((s) => s.selectedDoorId)
  const selectDoor = useEditorStore((s) => s.selectDoor)

  const [exported, setExported] = useState(false)
  const visible = viewDoorsMode || placeDoorMode

  const handleDoorRowClick = (door: DoorTrigger) => {
    selectDoor(door.id === selectedDoorId ? null : door.id)
    freeCameraJumpTarget.current = { x: door.x, y: 0, z: door.z }
  }

  const handleExport = () => {
    exportDoorsToClipboard(placedDoors)
    setExported(true)
    setTimeout(() => setExported(false), 1500)
  }

  const handleClose = () => {
    setViewDoorsMode(false)
    setPlaceDoorMode(false)
    selectDoor(null)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="doors-sidebar"
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
              <span className="text-xl">🚪</span>
              <div>
                <div className="font-bold text-[13px] tracking-wide" style={{ color: 'rgb(253,224,71)' }}>
                  Portes
                </div>
                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {placedDoors.length} placée{placedDoors.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[13px] transition-all"
              style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'transparent' }}
            >
              ✕
            </button>
          </div>

          {/* ── View style ── */}
          <div className="flex gap-1.5 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {([
              ['xray',      '👁', 'X-Ray'],
              ['full',      '🎨', 'Full'],
              ['wireframe', '〰', 'Wire'],
            ] as const).map(([style, icon, label]) => (
              <button
                key={style}
                onClick={() => setDoorViewStyle(style)}
                className="flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-wide transition-all"
                style={{
                  background: doorViewStyle === style
                    ? 'linear-gradient(180deg, rgba(251,191,36,0.18) 0%, rgba(180,130,40,0.1) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: doorViewStyle === style
                    ? '1px solid rgba(251,191,36,0.35)'
                    : '1px solid rgba(255,255,255,0.06)',
                  color: doorViewStyle === style ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.35)',
                }}
              >
                <span className="text-sm">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* ── Place hint ── */}
          <AnimatePresence>
            {placeDoorMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden shrink-0 px-3 pt-2"
              >
                <div
                  className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(180,130,40,0.06) 100%)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    color: 'rgb(253,224,71)',
                  }}
                >
                  <div className="font-semibold">🟢 Entrée  ·  🔴 Sortie</div>
                  <div className="mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    X / C pour tourner · clic pour poser
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Door list ── */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(160,110,40,0.3) transparent' }}
          >
            {placedDoors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="text-3xl opacity-20">🚪</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Aucune porte placée
                </span>
              </div>
            ) : (
              placedDoors.map((door) => (
                <DoorRow
                  key={door.id}
                  door={door}
                  isSelected={selectedDoorId === door.id}
                  onRowClick={() => handleDoorRowClick(door)}
                />
              ))
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-3 pb-4 pt-3 space-y-2 shrink-0"
            style={{ borderTop: '1px solid rgba(160,110,40,0.15)' }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const next = !placeDoorMode
                setPlaceDoorMode(next)
                if (next) setViewDoorsMode(true)
              }}
              className="w-full rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all"
              style={placeDoorMode ? {
                background: 'linear-gradient(180deg, rgba(251,191,36,0.4) 0%, rgba(180,130,40,0.3) 100%)',
                border: '1px solid rgba(251,191,36,0.5)',
                color: 'rgb(253,224,71)',
                boxShadow: '0 0 16px rgba(251,191,36,0.2)',
              } : {
                background: 'linear-gradient(180deg, rgba(251,191,36,0.12) 0%, rgba(180,130,40,0.08) 100%)',
                border: '1px solid rgba(251,191,36,0.25)',
                color: 'rgba(253,224,71,0.8)',
              }}
            >
              {placeDoorMode ? '✕  Annuler placement' : '＋  Placer une porte'}
            </motion.button>

            <button
              onClick={handleExport}
              className="w-full rounded-xl py-2 text-[11px] font-medium transition-all"
              style={{
                background: exported ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)',
                border: exported ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: exported ? 'rgb(134,239,172)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {exported ? '✓  Copié dans le presse-papier' : 'Export clipboard'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
