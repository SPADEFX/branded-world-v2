'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { HitboxEditor } from './HitboxEditor'
import { saveEditorState } from '@/config/editorPersistence'
import { playerPosition } from '@/lib/playerRef'
import { clearAllHitboxes } from '@/lib/hitboxes'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'

export function EditorSidebar() {
  const enabled = useEditorStore((s) => s.enabled)
  const toggle = useEditorStore((s) => s.toggle)
  const eraserMode = useEditorStore((s) => s.eraserMode)
  const setEraserMode = useEditorStore((s) => s.setEraserMode)
  const teleportMode = useEditorStore((s) => s.teleportMode)
  const setTeleportMode = useEditorStore((s) => s.setTeleportMode)
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
  const selectedDynamic = selectedId
    ? dynamicObjects.find((o) => o.id === selectedId)
    : null
  const selected = selectedDynamic || selectedStatic

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const state = useEditorStore.getState()
    saveEditorState(state.objects, state.hiddenIds, state.dynamicObjects)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleAddDoor = () => {
    const { x, z } = playerPosition
    const entry = `{ id: 'door_${Date.now()}', x: ${x.toFixed(2)}, z: ${z.toFixed(2)}, radius: 1.5 },`
    console.log('[Door Trigger]', entry)
    navigator.clipboard.writeText(entry)
    alert(`Copied to clipboard:\n${entry}`)
  }

  const handleResetHitboxes = () => {
    clearAllHitboxes()
    for (const key in HITBOX_OVERRIDES) delete HITBOX_OVERRIDES[key]
    localStorage.removeItem('hitbox-overrides')
    localStorage.removeItem('editor-state')
    useEditorStore.getState().bumpHitboxVersion()
  }

  return (
    <>
      {/* Toggle — always visible */}
      <button
        onClick={toggle}
        className={`pointer-events-auto absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
          enabled
            ? 'bg-indigo-500/80 text-white hover:bg-indigo-500'
            : 'bg-black/30 text-white/70 hover:bg-black/50'
        }`}
      >
        {enabled ? 'Editor ON' : 'Editor OFF'}
      </button>

      {/* Sidebar */}
      {enabled && (
        <div className="pointer-events-auto absolute left-0 top-0 bottom-0 flex w-56 flex-col bg-black/60 backdrop-blur-xl text-white text-xs border-r border-white/10">
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
                onClick={() => {
                  setEraserMode(false)
                  setMode('translate')
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                  mode === 'translate' && !eraserMode
                    ? 'bg-white/20'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Move
              </button>
              <button
                onClick={() => {
                  setEraserMode(false)
                  setMode('rotate')
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                  mode === 'rotate' && !eraserMode
                    ? 'bg-white/20'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Rotate
              </button>
              <button
                onClick={() => setEraserMode(!eraserMode)}
                className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                  eraserMode
                    ? 'bg-red-500/40 text-red-200'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Eraser
              </button>
              <button
                onClick={() => setTeleportMode(!teleportMode)}
                className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                  teleportMode
                    ? 'bg-emerald-500/40 text-emerald-200'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                TP
              </button>
            </div>

            {/* Selected info */}
            {selected ? (
              <div className="space-y-1 rounded-lg bg-white/5 p-2">
                <div className="text-white/50 truncate">
                  {selected.model.split('/').pop()}
                </div>
                <div>
                  x: {selected.position[0].toFixed(2)} y:{' '}
                  {selected.position[1].toFixed(2)} z:{' '}
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
                {eraserMode
                  ? 'Hover & click to delete'
                  : 'Click an object to select'}
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              className={`w-full rounded-lg px-3 py-2 font-medium transition-colors ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-sky-500/70 hover:bg-sky-500'
              }`}
            >
              {saved ? 'Saved!' : 'Save All'}
            </button>

            <button
              onClick={handleAddDoor}
              className="w-full rounded-lg bg-amber-500/20 px-3 py-1.5 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Add Door Here
            </button>

            <button
              onClick={handleResetHitboxes}
              className="w-full rounded-lg bg-red-500/20 px-3 py-1.5 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              Reset Hitboxes
            </button>

            <div className="text-white/30 text-center">
              {dynamicObjects.length} placed
            </div>
          </div>
        </div>
      )}
    </>
  )
}
