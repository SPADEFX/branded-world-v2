export interface CollectibleConfig {
  id: string
  type: 'gem-small' | 'gem-medium' | 'gem-large' | 'gold-nugget' | 'coin-stack'
  position: [number, number, number]
}

/** Model path for each collectible type */
export const COLLECTIBLE_MODELS: Record<CollectibleConfig['type'], string> = {
  'gem-small': '/models/kaykit/resources/Gem_Small.gltf',
  'gem-medium': '/models/kaykit/resources/Gem_Medium.gltf',
  'gem-large': '/models/kaykit/resources/Gem_Large.gltf',
  'gold-nugget': '/models/kaykit/resources/Gold_Nugget_Large.gltf',
  'coin-stack': '/models/kaykit/resources/Money_Coins_Stack_Large.gltf',
}

/** Points awarded per type */
export const COLLECTIBLE_POINTS: Record<CollectibleConfig['type'], number> = {
  'gem-small': 1,
  'gem-medium': 3,
  'gem-large': 5,
  'gold-nugget': 2,
  'coin-stack': 2,
}

/** Color tint for the glow effect per type */
export const COLLECTIBLE_GLOW: Record<CollectibleConfig['type'], string> = {
  'gem-small': '#a78bfa',
  'gem-medium': '#34d399',
  'gem-large': '#f472b6',
  'gold-nugget': '#fbbf24',
  'coin-stack': '#fbbf24',
}

export const COLLECTIBLE_PICKUP_RADIUS = 1.5

/** Gems and treasures scattered across the continent */
export const COLLECTIBLES: CollectibleConfig[] = [
  // ── Small gems — near village paths ────────────────────────
  { id: 'gem-01', type: 'gem-small', position: [8, 0.3, 14] },
  { id: 'gem-02', type: 'gem-small', position: [-6, 0.3, 14] },
  { id: 'gem-03', type: 'gem-small', position: [16, 0.3, -2] },
  { id: 'gem-04', type: 'gem-small', position: [-14, 0.3, -6] },
  { id: 'gem-05', type: 'gem-small', position: [2, 0.3, -14] },
  { id: 'gem-06', type: 'gem-small', position: [22, 0.3, 12] },
  { id: 'gem-07', type: 'gem-small', position: [-20, 0.3, 10] },
  { id: 'gem-08', type: 'gem-small', position: [8, 0.3, -24] },
  { id: 'gem-09', type: 'gem-small', position: [-4, 0.3, 24] },
  { id: 'gem-10', type: 'gem-small', position: [26, 0.3, -8] },

  // ── Medium gems — in the forest ring ───────────────────────
  { id: 'gem-11', type: 'gem-medium', position: [30, 0.3, 6] },
  { id: 'gem-12', type: 'gem-medium', position: [-26, 0.3, -12] },
  { id: 'gem-13', type: 'gem-medium', position: [14, 0.3, -28] },
  { id: 'gem-14', type: 'gem-medium', position: [-16, 0.3, 24] },
  { id: 'gem-15', type: 'gem-medium', position: [36, 0.3, 18] },

  // ── Large gems — rare, at the edges ────────────────────────
  { id: 'gem-16', type: 'gem-large', position: [-32, 0.3, -16] },
  { id: 'gem-17', type: 'gem-large', position: [38, 0.3, -4] },
  { id: 'gem-18', type: 'gem-large', position: [-8, 0.3, -36] },

  // ── Gold nuggets — along the coast ─────────────────────────
  { id: 'gold-01', type: 'gold-nugget', position: [28, 0.3, 28] },
  { id: 'gold-02', type: 'gold-nugget', position: [-30, 0.3, 8] },
  { id: 'gold-03', type: 'gold-nugget', position: [18, 0.3, 34] },
  { id: 'gold-04', type: 'gold-nugget', position: [-24, 0.3, -24] },

  // ── Coin stacks — near structures ──────────────────────────
  { id: 'coin-01', type: 'coin-stack', position: [26, 0.3, -10] },
  { id: 'coin-02', type: 'coin-stack', position: [-12, 0.3, 30] },
  { id: 'coin-03', type: 'coin-stack', position: [10, 0.3, -30] },

  // ── Secondary island collectibles ──────────────────────────
  { id: 'gem-19', type: 'gem-large', position: [70, 0.3, 30] },
  { id: 'gold-05', type: 'gold-nugget', position: [74, 0.3, 26] },
  { id: 'coin-04', type: 'coin-stack', position: [68, 0.3, 34] },
]
