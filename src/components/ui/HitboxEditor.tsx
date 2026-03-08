'use client'

import { useState, useEffect } from 'react'
import { HITBOX_OVERRIDES } from '@/config/hitboxOverrides'
import { useEditorStore } from '@/stores/editorStore'
import type { ModelHitboxConfig, HitboxDefinition } from '@/config/hitboxOverrides'

interface Props {
  modelPath: string
}

export function HitboxEditor({ modelPath }: Props) {
  const [config, setConfig] = useState<ModelHitboxConfig>(() => {
    const existing = HITBOX_OVERRIDES[modelPath]
    return existing
      ? { ...existing, hitboxes: existing.hitboxes.map((h) => ({ ...h })) }
      : { mode: 'auto', hitboxes: [] }
  })

  // Reset when selecting a different model
  useEffect(() => {
    const existing = HITBOX_OVERRIDES[modelPath]
    setConfig(
      existing
        ? { ...existing, hitboxes: existing.hitboxes.map((h) => ({ ...h })) }
        : { mode: 'auto', hitboxes: [] },
    )
  }, [modelPath])

  const setMode = (mode: 'auto' | 'manual' | 'none') => {
    setConfig((prev) => {
      const next = { ...prev, mode }
      // When switching to manual, add a default hitbox if empty
      if (mode === 'manual' && next.hitboxes.length === 0) {
        next.hitboxes = [{ offsetX: 0, offsetZ: 0, halfW: 0.3, halfD: 0.3, height: 1 }]
      }
      return next
    })
  }

  const addHitbox = (shape: 'box' | 'circle' = 'box') => {
    setConfig((prev) => ({
      ...prev,
      hitboxes: [
        ...prev.hitboxes,
        shape === 'circle'
          ? { offsetX: 0, offsetZ: 0, halfW: 0.3, halfD: 0.3, height: 1, shape: 'circle' as const }
          : { offsetX: 0, offsetZ: 0, halfW: 0.2, halfD: 0.2, height: 1 },
      ],
    }))
  }

  const updateHitbox = (index: number, field: keyof HitboxDefinition | 'shape', value: number | string) => {
    setConfig((prev) => {
      const updated = [...prev.hitboxes]
      if (field === 'shape') {
        const isCircle = value === 'circle'
        updated[index] = {
          ...updated[index],
          shape: isCircle ? 'circle' : undefined,
          // When switching to circle, set halfD = halfW (radius)
          ...(isCircle ? { halfD: updated[index].halfW } : {}),
        }
      } else {
        updated[index] = { ...updated[index], [field]: value as number }
        // For circle, keep halfD in sync with halfW (both = radius)
        if (field === 'halfW' && updated[index].shape === 'circle') {
          updated[index] = { ...updated[index], halfD: value as number }
        }
      }
      return { ...prev, hitboxes: updated }
    })
  }

  const deleteHitbox = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      hitboxes: prev.hitboxes.filter((_, i) => i !== index),
    }))
  }

  // Live preview — push every config change to HITBOX_OVERRIDES immediately
  useEffect(() => {
    if (config.mode === 'auto' && (config.autoScale ?? 1.2) === 1.2) {
      delete HITBOX_OVERRIDES[modelPath]
    } else {
      HITBOX_OVERRIDES[modelPath] = {
        mode: config.mode,
        autoScale: config.autoScale,
        hitboxes: config.hitboxes.map((h) => ({ ...h })),
      }
    }
    useEditorStore.getState().bumpHitboxVersion()
  }, [config, modelPath])

  return (
    <div className="border-t border-white/10 pt-2 mt-2">
      <div className="text-white/50 text-[10px] mb-0.5">HITBOX CONFIG</div>
      <div className="text-white/30 text-[9px] mb-1 truncate">
        All {modelPath.split('/').pop()?.replace('.glb', '')}
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-2">
        {(['auto', 'manual', 'none'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-2 py-1 text-[10px] capitalize transition-colors ${
              config.mode === m
                ? 'bg-sky-500/30 text-sky-200'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Auto scale slider */}
      {config.mode === 'auto' && (
        <div className="mb-2">
          <label className="text-[10px] text-white/50">
            Scale: {(config.autoScale ?? 1.2).toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={config.autoScale ?? 1.2}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, autoScale: parseFloat(e.target.value) }))
            }
            className="w-full h-1 accent-sky-400"
          />
        </div>
      )}

      {/* Manual hitboxes */}
      {config.mode === 'manual' && (
        <div className="space-y-1.5">
          {config.hitboxes.map((hb, idx) => (
            <HitboxItem
              key={idx}
              index={idx}
              hitbox={hb}
              onUpdate={(field, value) => updateHitbox(idx, field as any, value)}
              onDelete={() => deleteHitbox(idx)}
            />
          ))}

          <div className="flex gap-1">
            <button
              onClick={() => addHitbox('box')}
              className="flex-1 rounded bg-emerald-500/20 px-2 py-1 text-[10px] hover:bg-emerald-500/30 transition-colors"
            >
              + Box
            </button>
            <button
              onClick={() => addHitbox('circle')}
              className="flex-1 rounded bg-sky-500/20 px-2 py-1 text-[10px] hover:bg-sky-500/30 transition-colors"
            >
              + Circle
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function HitboxItem({
  index,
  hitbox,
  onUpdate,
  onDelete,
}: {
  index: number
  hitbox: HitboxDefinition
  onUpdate: (field: keyof HitboxDefinition | 'shape', value: number | string) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isCircle = hitbox.shape === 'circle'

  return (
    <div className={`rounded p-1.5 ${isCircle ? 'bg-sky-500/10' : 'bg-white/5'}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-white/70 hover:text-white flex-1 text-left"
        >
          {expanded ? '\u25BC' : '\u25B6'} {isCircle ? 'Circle' : 'Box'} {index}
        </button>
        <button
          onClick={() => onUpdate('shape', isCircle ? 'box' : 'circle')}
          className="text-[10px] text-white/40 hover:text-white px-1"
          title="Toggle shape"
        >
          {isCircle ? '\u25CB' : '\u25A1'}
        </button>
        <button
          onClick={onDelete}
          className="text-red-400 text-[10px] hover:text-red-300 px-1"
        >
          x
        </button>
      </div>

      {expanded && (
        <div className="mt-1 space-y-0.5">
          <Slider label="offX" value={hitbox.offsetX} onChange={(v) => onUpdate('offsetX', v)} min={-3} max={3} step={0.05} />
          <Slider label="offZ" value={hitbox.offsetZ} onChange={(v) => onUpdate('offsetZ', v)} min={-3} max={3} step={0.05} />
          {isCircle ? (
            <Slider label="radius" value={hitbox.halfW} onChange={(v) => onUpdate('halfW', v)} min={0.05} max={3} step={0.05} />
          ) : (
            <>
              <Slider label="halfW" value={hitbox.halfW} onChange={(v) => onUpdate('halfW', v)} min={0.05} max={3} step={0.05} />
              <Slider label="halfD" value={hitbox.halfD} onChange={(v) => onUpdate('halfD', v)} min={0.05} max={3} step={0.05} />
            </>
          )}
          <Slider label="height" value={hitbox.height} onChange={(v) => onUpdate('height', v)} min={0.1} max={5} step={0.1} />
        </div>
      )}
    </div>
  )
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-white/40 w-8 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-sky-400"
      />
      <span className="text-[9px] text-white/50 w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}
