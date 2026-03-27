'use client'

import { useEditorStore } from '@/stores/editorStore'

export function EditorPanel() {
  const enabled = useEditorStore((s) => s.enabled)
  const toggle = useEditorStore((s) => s.toggle)
  const selectedId = useEditorStore((s) => s.selectedId)
  const objects = useEditorStore((s) => s.objects)
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const select = useEditorStore((s) => s.select)

  const selected = selectedId ? objects[selectedId] : null

  const exportPositions = () => {
    const data = Object.values(objects).map((obj) => ({
      model: obj.model,
      position: obj.position.map((v) => Math.round(v * 100) / 100),
      rotation: Math.round(obj.rotation * 100) / 100,
      scale: obj.scale,
    }))
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    alert('Positions copied to clipboard!')
  }

  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 flex flex-col gap-2">
      {enabled && (
        <div className="rounded-xl bg-black/50 p-4 backdrop-blur-md text-white text-xs min-w-[220px]">
          {/* Mode switcher */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setMode('translate')}
              className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${
                mode === 'translate' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              Move (G)
            </button>
            <button
              onClick={() => setMode('rotate')}
              className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${
                mode === 'rotate' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              Rotate (R)
            </button>
          </div>

          {/* Selected object info */}
          {selected ? (
            <div className="space-y-1.5">
              <div className="text-white/50 truncate">{selected.model.split('/').pop()}</div>
              <div>
                x: {selected.position[0].toFixed(2)} y: {selected.position[1].toFixed(2)} z:{' '}
                {selected.position[2].toFixed(2)}
              </div>
              <div>rot: {selected.rotation.toFixed(2)}</div>
              <button
                onClick={() => select(null)}
                className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20 transition-colors"
              >
                Deselect (Esc)
              </button>
            </div>
          ) : (
            <div className="text-white/40">Click an object to select it</div>
          )}

          {/* Export */}
          <button
            onClick={exportPositions}
            className="mt-3 w-full rounded-lg bg-emerald-500/70 px-3 py-2 font-medium hover:bg-emerald-500 transition-colors"
          >
            Export Positions
          </button>
        </div>
      )}
    </div>
  )
}
