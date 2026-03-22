import { create } from 'zustand'

export interface BenchmarkResult {
  label: string
  avgFps: number
  minFps: number
  config: string
}

interface GraphicsState {
  // Shadows
  shadows: boolean
  shadowMapSize: 512 | 1024 | 2048
  shadowIntensity: number

  // Post-processing
  bloom: boolean
  bloomIntensity: number
  saturation: number
  godRays: boolean
  godRaysWeight: number

  // Fog
  fogEnabled: boolean
  fogDensity: number

  // Ambient / directional light
  ambientIntensity: number
  directionalIntensity: number

  // UI
  dashboardOpen: boolean

  // Performance
  fps: number
  drawCalls: number
  isBenchmarking: boolean
  benchmarkResults: BenchmarkResult[]

  set: (patch: Partial<Omit<GraphicsState, 'set'>>) => void
}

export const useGraphicsStore = create<GraphicsState>((set) => ({
  shadows: true,
  shadowMapSize: 512,
  shadowIntensity: 1.5,

  bloom: true,
  bloomIntensity: 0.4,
  saturation: 0.3,
  godRays: false,
  godRaysWeight: 0.25,

  fogEnabled: true,
  fogDensity: 0.010,

  ambientIntensity: 1.2,
  directionalIntensity: 1.6,

  dashboardOpen: false,

  fps: 0,
  drawCalls: 0,
  isBenchmarking: false,
  benchmarkResults: [],

  set: (patch) => set(patch),
}))
