'use client'

import { useState, useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import {
  MODEL_CATALOG,
  CATEGORIES,
  needsTexture,
  getColormapPath,
} from '@/config/modelCatalog'
import { generateThumbnails } from '@/lib/thumbnailRenderer'
import { HitboxEditor } from './HitboxEditor'
import { saveEditorState } from '@/config/editorPersistence'
import { clearAllHitboxes } from '@/lib/hitboxes'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'

/* ── Thumbnail hook — generates lazily per category ───────── */

function useThumbnails(category: string) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const models = MODEL_CATALOG.filter((m) => m.category === category)
    const texPath = needsTexture(category)
      ? getColormapPath(category)
      : undefined

    generateThumbnails(
      models.map((m) => m.path),
      texPath,
      (path, dataUrl) => {
        if (!cancelled) setThumbs((prev) => ({ ...prev, [path]: dataUrl }))
      }
    ).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [category])

  return thumbs
}

/* ── Sidebar ──────────────────────────────────────────────── */

export function EditorSidebar() {
  const enabled = useEditorStore((s) => s.enabled)
  const toggle = useEditorStore((s) => s.toggle)
  const placingModel = useEditorStore((s) => s.placingModel)
  const setPlacingModel = useEditorStore((s) => s.setPlacingModel)
  const eraserMode = useEditorStore((s) => s.eraserMode)
  const setEraserMode = useEditorStore((s) => s.setEraserMode)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const selectedId = useEditorStore((s) => s.selectedId)
  const objects = useEditorStore((s) => s.objects)
  const dynamicObjects = useEditorStore((s) => s.dynamicObjects)
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const select = useEditorStore((s) => s.select)
  const removeObject = useEditorStore((s) => s.removeObject)

  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0])
  const thumbs = useThumbnails(activeCategory)

  const selectedStatic = selectedId ? objects[selectedId] : null
  const selectedDynamic = selectedId
    ? dynamicObjects.find((o) => o.id === selectedId)
    : null
  const selected = selectedDynamic || selectedStatic
  const isDynamic = !!selectedDynamic

  const filteredModels = MODEL_CATALOG.filter(
    (m) => m.category === activeCategory
  )

  const handleModelClick = (path: string) => {
    if (placingModel === path) {
      setPlacingModel(null)
    } else {
      setPlacingModel(path)
    }
  }

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const state = useEditorStore.getState()
    saveEditorState(state.objects, state.hiddenIds, state.dynamicObjects)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleResetHitboxes = () => {
    // Clear in-memory hitbox entries
    clearAllHitboxes()
    // Clear in-memory overrides
    for (const key in HITBOX_OVERRIDES) delete HITBOX_OVERRIDES[key]
    // Clear ALL editor localStorage
    localStorage.removeItem('hitbox-overrides')
    localStorage.removeItem('editor-state')
    // Re-register all hitboxes from scratch
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
        <div className="pointer-events-auto absolute left-0 top-0 bottom-0 flex w-72 flex-col bg-black/60 backdrop-blur-xl text-white text-xs border-r border-white/10">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 p-3 border-b border-white/10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Placement / eraser hints */}
          {placingModel && (
            <div className="mx-3 mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-emerald-300">
              Click in scene to place. Esc to cancel.
            </div>
          )}
          {eraserMode && (
            <div className="mx-3 mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-red-300">
              Hover an object and click to delete it.
            </div>
          )}

          {/* Model grid with thumbnails */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-1.5">
              {filteredModels.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleModelClick(item.path)}
                  className={`rounded-lg p-1.5 text-center transition-colors ${
                    placingModel === item.path
                      ? 'bg-emerald-500/30 text-white ring-1 ring-emerald-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  title={item.label}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square w-full rounded bg-black/30 mb-1 flex items-center justify-center overflow-hidden">
                    {thumbs[item.path] ? (
                      <img
                        src={thumbs[item.path]}
                        alt={item.label}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                    )}
                  </div>
                  <span className="truncate block text-[10px] leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
