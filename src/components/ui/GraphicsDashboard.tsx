'use client'

import { useGraphicsStore } from '@/stores/graphicsStore'
import type { BenchmarkResult } from '@/stores/graphicsStore'
import { useEffect, useRef } from 'react'

const BENCHMARK_CONFIGS = [
  {
    label: 'Everything ON (shadows 2048)',
    settings: { shadows: true, shadowMapSize: 2048 as const, bloom: true, godRays: true, fogEnabled: true },
  },
  {
    label: 'Shadows 512 + Bloom + Fog',
    settings: { shadows: true, shadowMapSize: 512 as const, bloom: true, godRays: false, fogEnabled: true },
  },
  {
    label: 'No Shadows + Bloom + Fog',
    settings: { shadows: false, shadowMapSize: 512 as const, bloom: true, godRays: false, fogEnabled: true },
  },
  {
    label: 'No Post-FX + Shadows',
    settings: { shadows: true, shadowMapSize: 512 as const, bloom: false, godRays: false, fogEnabled: true },
  },
  {
    label: 'Fog only (minimal)',
    settings: { shadows: false, shadowMapSize: 512 as const, bloom: false, godRays: false, fogEnabled: true },
  },
  {
    label: 'Bare (nothing)',
    settings: { shadows: false, shadowMapSize: 512 as const, bloom: false, godRays: false, fogEnabled: false },
  },
]

const STEP_DURATION = 3500 // ms per config

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#ccc' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: value ? '#4ade80' : '#555', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: value ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format?: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#ccc' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#999' }}>{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4ade80' }}
      />
    </div>
  )
}

function Select({ label, value, options, onChange }: {
  label: string; value: number; options: number[]; onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#ccc' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          background: '#333', color: '#fff', border: '1px solid #555',
          borderRadius: 4, padding: '2px 6px', fontSize: 12,
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}px</option>)}
      </select>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function fpsColor(fps: number) {
  if (fps >= 55) return '#4ade80'
  if (fps >= 35) return '#facc15'
  return '#f87171'
}

export function GraphicsDashboard() {
  const store = useGraphicsStore()
  const { dashboardOpen, set, fps, drawCalls, isBenchmarking, benchmarkResults } = store
  const benchmarkState = useRef<{ step: number; samples: number[]; savedSettings: object } | null>(null)
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Toggle with G key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
        set({ dashboardOpen: !dashboardOpen })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dashboardOpen, set])

  // FPS sampling during benchmark
  useEffect(() => {
    if (!isBenchmarking) return
    const interval = setInterval(() => {
      if (benchmarkState.current) {
        benchmarkState.current.samples.push(fps)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [isBenchmarking, fps])

  function runBenchmark() {
    if (isBenchmarking) return

    const savedSettings = {
      shadows: store.shadows, shadowMapSize: store.shadowMapSize,
      bloom: store.bloom, godRays: store.godRays, fogEnabled: store.fogEnabled,
    }

    benchmarkState.current = { step: 0, samples: [], savedSettings }
    set({ isBenchmarking: true, benchmarkResults: [] })

    function runStep(index: number) {
      if (index >= BENCHMARK_CONFIGS.length) {
        // Done — restore settings
        set({ ...savedSettings as object, isBenchmarking: false })
        benchmarkState.current = null
        return
      }

      const cfg = BENCHMARK_CONFIGS[index]
      set(cfg.settings)
      benchmarkState.current!.samples = []

      stepTimer.current = setTimeout(() => {
        const samples = benchmarkState.current!.samples.filter(Boolean)
        const avg = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0
        const min = samples.length ? Math.min(...samples) : 0

        const result: BenchmarkResult = {
          label: cfg.label,
          avgFps: avg,
          minFps: min,
          config: JSON.stringify(cfg.settings),
        }

        set({ benchmarkResults: [...useGraphicsStore.getState().benchmarkResults, result] })
        runStep(index + 1)
      }, STEP_DURATION)
    }

    runStep(0)
  }

  function copyReport() {
    const gpu = (navigator as unknown as { gpu?: unknown }).gpu ? 'WebGPU capable' : 'WebGL'
    const ua = navigator.userAgent
    const lines = [
      '=== GRAPHICS BENCHMARK REPORT ===',
      `Date: ${new Date().toLocaleString()}`,
      `UA: ${ua}`,
      `API: ${gpu}`,
      '',
      ...benchmarkResults.map((r) =>
        `[${r.avgFps >= 55 ? '✓' : r.avgFps >= 35 ? '~' : '✗'}] ${r.label}\n    avg: ${r.avgFps} FPS  |  min: ${r.minFps} FPS`
      ),
      '',
      `Draw calls: ${drawCalls} | Current settings: shadows=${store.shadows} shadowMap=${store.shadowMapSize} bloom=${store.bloom} godRays=${store.godRays} fog=${store.fogEnabled}`,
      '=================================',
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const progress = isBenchmarking
    ? Math.round((benchmarkResults.length / BENCHMARK_CONFIGS.length) * 100)
    : null

  return (
    <>
      <button
        onClick={() => set({ dashboardOpen: !dashboardOpen })}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          background: '#1a1a1a', border: '1px solid #444', color: '#fff',
          borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ color: fpsColor(fps), fontWeight: 700 }}>{fps} FPS</span>
        <span style={{ color: '#888' }}>Graphics {dashboardOpen ? '▲' : '▼'}</span>
      </button>

      {dashboardOpen && (
        <div style={{
          position: 'fixed', bottom: 52, right: 16, zIndex: 1000,
          background: '#1a1a1aee', border: '1px solid #444',
          borderRadius: 12, padding: 16, width: 280,
          display: 'flex', flexDirection: 'column', gap: 16,
          backdropFilter: 'blur(8px)', fontFamily: 'monospace',
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Graphics Settings</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: fpsColor(fps) }}>{fps} FPS</div>
              <div style={{ fontSize: 10, color: '#666' }}>{drawCalls} draw calls</div>
            </div>
          </div>

          <Section title="Shadows">
            <Toggle label="Enable shadows" value={store.shadows} onChange={(v) => set({ shadows: v })} />
            <Select label="Shadow map" value={store.shadowMapSize} options={[512, 1024, 2048]} onChange={(v) => set({ shadowMapSize: v as 512 | 1024 | 2048 })} />
            <Slider label="Intensity" value={store.shadowIntensity} min={0} max={3} step={0.1} onChange={(v) => set({ shadowIntensity: v })} />
          </Section>

          <Section title="Post-processing">
            <Toggle label="Bloom" value={store.bloom} onChange={(v) => set({ bloom: v })} />
            <Slider label="Bloom intensity" value={store.bloomIntensity} min={0} max={2} step={0.05} onChange={(v) => set({ bloomIntensity: v })} />
            <Slider label="Saturation" value={store.saturation} min={-1} max={1} step={0.05} onChange={(v) => set({ saturation: v })} />
            <Toggle label="God Rays" value={store.godRays} onChange={(v) => set({ godRays: v })} />
            <Slider label="God Rays weight" value={store.godRaysWeight} min={0} max={1} step={0.05} onChange={(v) => set({ godRaysWeight: v })} />
          </Section>

          <Section title="Fog">
            <Toggle label="Enable fog" value={store.fogEnabled} onChange={(v) => set({ fogEnabled: v })} />
            <Slider label="Density" value={store.fogDensity} min={0.001} max={0.05} step={0.001} onChange={(v) => set({ fogDensity: v })} format={(v) => v.toFixed(3)} />
          </Section>

          <Section title="Lighting">
            <Slider label="Ambient" value={store.ambientIntensity} min={0} max={3} step={0.1} onChange={(v) => set({ ambientIntensity: v })} />
            <Slider label="Directional" value={store.directionalIntensity} min={0} max={4} step={0.1} onChange={(v) => set({ directionalIntensity: v })} />
          </Section>

          <Section title="Benchmark">
            <button
              onClick={runBenchmark}
              disabled={isBenchmarking}
              style={{
                background: isBenchmarking ? '#333' : '#4ade80', color: '#000',
                border: 'none', borderRadius: 6, padding: '8px 12px',
                fontSize: 12, fontWeight: 700, cursor: isBenchmarking ? 'default' : 'pointer',
              }}
            >
              {isBenchmarking
                ? `Testing... ${progress}% (${benchmarkResults.length}/${BENCHMARK_CONFIGS.length})`
                : 'Run Benchmark'}
            </button>

            {isBenchmarking && (
              <div style={{ height: 4, background: '#333', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#4ade80', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            )}

            {benchmarkResults.length > 0 && !isBenchmarking && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {benchmarkResults.map((r) => (
                    <div key={r.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#222', borderRadius: 4, padding: '4px 8px',
                    }}>
                      <span style={{ fontSize: 10, color: '#999', flex: 1, marginRight: 8 }}>{r.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: fpsColor(r.avgFps), whiteSpace: 'nowrap' }}>
                        {r.avgFps} <span style={{ fontSize: 10, color: '#666' }}>avg</span>
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={copyReport}
                  style={{
                    background: '#333', color: '#ccc', border: '1px solid #555',
                    borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Copy report (paste to Claude)
                </button>
              </>
            )}
          </Section>
        </div>
      )}
    </>
  )
}
