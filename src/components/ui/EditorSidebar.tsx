'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { HitboxEditor } from './HitboxEditor'
import { saveEditorState } from '@/config/editorPersistence'
import { clearAllHitboxes } from '@/lib/hitboxes'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'
import { useCollisionStore } from '@/stores/collisionStore'
import { exportDoorsToClipboard, type DoorTrigger } from '@/config/indoorZones'
import { freeCameraJumpTarget } from '@/lib/playerRef'

function dirArrow(nx: number, nz: number) {
  const a = Math.atan2(nx, -nz)
  const idx = Math.round((a / (Math.PI * 2)) * 8 + 8) % 8
  return ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][idx]
}

function DoorRow({
  door,
  isSelected,
  onRowClick,
}: {
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
    <div
      onClick={onRowClick}
      className={`rounded-lg px-2 py-1.5 cursor-pointer transition-colors space-y-1 ${
        isSelected
          ? 'bg-amber-500/15 ring-1 ring-amber-500/40'
          : 'bg-white/5 hover:bg-white/8'
      }`}
    >
      {/* Name / ID — click to rename */}
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
          className="w-full bg-transparent border-b border-amber-400 text-amber-300 font-mono text-[10px] outline-none"
          placeholder="Nom de la porte..."
        />
      ) : (
        <div
          onClick={startEdit}
          title="Cliquer pour renommer"
          className="text-amber-300/80 font-mono text-[10px] truncate hover:text-amber-200 transition-colors cursor-text"
        >
          {displayName}
        </div>
      )}

      {/* Position + direction */}
      <div className="text-white/40 font-mono text-[10px]">
        {door.x.toFixed(1)}, {door.z.toFixed(1)}
        <span className="ml-2 text-white/60">{dirArrow(door.nx, door.nz)}</span>
      </div>

      {/* Actions — only when selected */}
      {isSelected && (
        <div className="flex gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => flipDoor(door.id)}
            className="flex-1 rounded bg-sky-500/20 px-1 py-0.5 text-sky-300 hover:bg-sky-500/40 transition-colors"
          >
            ↔ Flip
          </button>
          <button
            onClick={() => { removeDoor(door.id); selectDoor(null) }}
            className="flex-1 rounded bg-red-500/20 px-1 py-0.5 text-red-300 hover:bg-red-500/40 transition-colors"
          >
            ✕ Delete
          </button>
        </div>
      )}
    </div>
  )
}

export function EditorSidebar() {
  const enabled = useEditorStore((s) => s.enabled)
  const toggle = useEditorStore((s) => s.toggle)
  const eraserMode = useEditorStore((s) => s.eraserMode)
  const setEraserMode = useEditorStore((s) => s.setEraserMode)
  const teleportMode = useEditorStore((s) => s.teleportMode)
  const setTeleportMode = useEditorStore((s) => s.setTeleportMode)
  const placeDoorMode = useEditorStore((s) => s.placeDoorMode)
  const setPlaceDoorMode = useEditorStore((s) => s.setPlaceDoorMode)
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)
  const setViewDoorsMode = useEditorStore((s) => s.setViewDoorsMode)
  const doorViewStyle = useEditorStore((s) => s.doorViewStyle)
  const setDoorViewStyle = useEditorStore((s) => s.setDoorViewStyle)
  const placedDoors = useEditorStore((s) => s.placedDoors)
  const selectedDoorId = useEditorStore((s) => s.selectedDoorId)
  const selectDoor = useEditorStore((s) => s.selectDoor)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const selectedId = useEditorStore((s) => s.selectedId)
  const objects = useEditorStore((s) => s.objects)
  const dynamicObjects = useEditorStore((s) => s.dynamicObjects)
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const select = useEditorStore((s) => s.select)
  const removeObject = useEditorStore((s) => s.removeObject)

  const selectedStatic = selectedId ? objects[selectedId] : null
  const selectedDynamic = selectedId ? dynamicObjects.find((o) => o.id === selectedId) : null
  const selected = selectedDynamic || selectedStatic

  const [saved, setSaved] = useState(false)
  const [exported, setExported] = useState(false)

  const handleSave = () => {
    const state = useEditorStore.getState()
    saveEditorState(state.objects, state.hiddenIds, state.dynamicObjects)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleExportDoors = () => {
    exportDoorsToClipboard(placedDoors)
    setExported(true)
    setTimeout(() => setExported(false), 1500)
  }

  const handleResetHitboxes = () => {
    clearAllHitboxes()
    for (const key in HITBOX_OVERRIDES) delete HITBOX_OVERRIDES[key]
    localStorage.removeItem('hitbox-overrides')
    localStorage.removeItem('editor-state')
    useCollisionStore.setState((s) => ({ version: s.version + 1 }))
  }

  const handleDoorRowClick = (door: DoorTrigger) => {
    selectDoor(door.id === selectedDoorId ? null : door.id)
    // Teleport free camera to the door
    freeCameraJumpTarget.current = { x: door.x, y: 0, z: door.z }
  }

  return (
    <>
      {/* Sidebar */}
      {enabled && (
        <div className="pointer-events-auto absolute left-0 top-0 bottom-0 flex w-56 flex-col bg-black/60 backdrop-blur-xl text-white text-xs border-r border-white/10 overflow-hidden">

          {/* ── VIEW DOORS mode ──────────────────────────── */}
          {viewDoorsMode ? (
            <>
              {/* Header */}
              <div className="border-b border-white/10 px-3 py-2 flex items-center justify-between shrink-0">
                <span className="font-medium text-amber-300">
                  Doors ({placedDoors.length})
                </span>
                <button
                  onClick={() => { setViewDoorsMode(false); selectDoor(null) }}
                  className="text-white/40 hover:text-white transition-colors text-xs"
                >
                  ✕
                </button>
              </div>

              {/* View style switcher */}
              <div className="flex gap-1 px-3 py-2 shrink-0 border-b border-white/10">
                {([
                  ['xray',      '👁 X-Ray'],
                  ['full',      '🎨 Full'],
                  ['wireframe', '〰 Wire'],
                ] as const).map(([style, label]) => (
                  <button
                    key={style}
                    onClick={() => setDoorViewStyle(style)}
                    className={`flex-1 rounded-lg py-1 text-[10px] transition-colors ${
                      doorViewStyle === style
                        ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-500/40'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Hint when placing */}
              {placeDoorMode && (
                <div className="mx-3 mt-2 rounded-lg bg-amber-500/15 px-2 py-1.5 text-amber-300 leading-tight shrink-0">
                  <div>Vert = entrée · rouge = sortie</div>
                  <div className="text-white/40 text-[10px] mt-0.5">X / C pour tourner · clic pour poser</div>
                </div>
              )}

              {/* Scrollable door list */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
                {placedDoors.length === 0 ? (
                  <div className="text-white/30 text-center pt-6 leading-relaxed">
                    Aucune porte placée.
                    <br />
                    <span className="text-amber-400/60">+ Place Door</span> pour commencer.
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

              {/* Door actions footer */}
              <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
                <button
                  onClick={() => setPlaceDoorMode(!placeDoorMode)}
                  className={`w-full rounded-lg px-3 py-1.5 transition-colors ${
                    placeDoorMode
                      ? 'bg-amber-500/60 text-amber-100'
                      : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  }`}
                >
                  {placeDoorMode ? 'Annuler placement' : '+ Place Door'}
                </button>
                <button
                  onClick={handleExportDoors}
                  className={`w-full rounded-lg px-3 py-1.5 transition-colors ${
                    exported
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {exported ? 'Copié !' : 'Export clipboard'}
                </button>
              </div>
            </>
          ) : (
            /* ── NORMAL mode ──────────────────────────────── */
            <>
              {eraserMode && (
                <div className="mx-3 mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-red-300">
                  Hover an object and click to delete it.
                </div>
              )}
              {teleportMode && (
                <div className="mx-3 mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-emerald-300">
                  Click anywhere on the map to teleport there.
                </div>
              )}
              {placeDoorMode && (
                <div className="mx-3 mt-3 rounded-lg bg-amber-500/20 px-3 py-2 text-amber-300 space-y-0.5">
                  <div>Vert = entrée · rouge = sortie</div>
                  <div className="text-white/50">X / C pour tourner · clic pour poser</div>
                </div>
              )}

              <div className="flex-1" />

              {/* Bottom panel */}
              <div className="border-t border-white/10 p-3 space-y-2">
                {/* Camera mode */}
                <div className="flex gap-1">
                  {(['follow', 'top', 'free'] as const).map((cm) => (
                    <button
                      key={cm}
                      onClick={() => setCameraMode(cm)}
                      className={`flex-1 rounded-lg px-2 py-1.5 capitalize transition-colors ${
                        cameraMode === cm
                          ? 'bg-sky-500/30 text-sky-200'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {cm === 'follow' ? 'Follow' : cm === 'top' ? 'Top' : 'Free'}
                    </button>
                  ))}
                </div>

                {/* Mode + eraser */}
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEraserMode(false); setMode('translate') }}
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                      mode === 'translate' && !eraserMode ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Move
                  </button>
                  <button
                    onClick={() => { setEraserMode(false); setMode('rotate') }}
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                      mode === 'rotate' && !eraserMode ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => setEraserMode(!eraserMode)}
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                      eraserMode ? 'bg-red-500/40 text-red-200' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Eraser
                  </button>
                  <button
                    onClick={() => setTeleportMode(!teleportMode)}
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                      teleportMode ? 'bg-emerald-500/40 text-emerald-200' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    TP
                  </button>
                </div>

                {/* Selected object info */}
                {selected ? (
                  <div className="space-y-1 rounded-lg bg-white/5 p-2">
                    <div className="text-white/50 truncate">{selected.model.split('/').pop()}</div>
                    <div>
                      x: {selected.position[0].toFixed(2)} y: {selected.position[1].toFixed(2)} z:{' '}
                      {selected.position[2].toFixed(2)}
                    </div>
                    <div>rot: {selected.rotation.toFixed(2)}</div>
                    <HitboxEditor modelPath={selected.model} />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => select(null)}
                        className="flex-1 rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20 transition-colors"
                      >
                        Deselect
                      </button>
                      <button
                        onClick={() => removeObject(selectedId!)}
                        className="flex-1 rounded-lg bg-red-500/40 px-2 py-1 hover:bg-red-500/60 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/30 text-center py-1">
                    {eraserMode ? 'Hover & click to delete' : 'Click an object to select'}
                  </div>
                )}

                {/* Save */}
                <button
                  onClick={handleSave}
                  className={`w-full rounded-lg px-3 py-2 font-medium transition-colors ${
                    saved ? 'bg-emerald-500 text-white' : 'bg-sky-500/70 hover:bg-sky-500'
                  }`}
                >
                  {saved ? 'Saved!' : 'Save All'}
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => setPlaceDoorMode(!placeDoorMode)}
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                      placeDoorMode
                        ? 'bg-amber-500/60 text-amber-100'
                        : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    }`}
                  >
                    {placeDoorMode ? 'Annuler' : 'Place Door'}
                  </button>
                  <button
                    onClick={() => setViewDoorsMode(true)}
                    className="flex-1 rounded-lg px-2 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    View Doors{placedDoors.length > 0 && <span className="ml-1 opacity-60">({placedDoors.length})</span>}
                  </button>
                </div>

                <button
                  onClick={handleResetHitboxes}
                  className="w-full rounded-lg bg-red-500/20 px-3 py-1.5 text-red-300 hover:bg-red-500/30 transition-colors"
                >
                  Reset Hitboxes
                </button>

                <div className="text-white/30 text-center">{dynamicObjects.length} placed</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
