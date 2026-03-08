// ---------------------------------------------------------------------------
// Seasonal Decoration System
// Automatically swaps decorations based on the current real-world date.
// ---------------------------------------------------------------------------

export type Season = 'halloween' | 'christmas' | 'none'

/** Determine the active season from the current date */
export function getActiveSeason(): Season {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  const day = now.getDate()

  // Halloween: October 1 – November 5
  if ((month === 9) || (month === 10 && day <= 5)) return 'halloween'

  // Christmas: December 1 – January 5
  if ((month === 11) || (month === 0 && day <= 5)) return 'christmas'

  return 'none'
}

// ── Decoration placement configs ──────────────────────────────────────────

interface SeasonalDecoration {
  model: string
  position: [number, number, number]
  rotation: number
  scale: number
}

/** Halloween decorations scattered around the island */
export const HALLOWEEN_DECORATIONS: SeasonalDecoration[] = [
  // Pumpkins around the plaza
  { model: '/models/seasonal/halloween/pumpkin_orange_jackolantern.gltf', position: [1, 0, 5], rotation: 0.3, scale: 3 },
  { model: '/models/seasonal/halloween/pumpkin_yellow_jackolantern.gltf', position: [-1, 0, 5], rotation: -0.5, scale: 3 },
  { model: '/models/seasonal/halloween/pumpkin_orange.gltf', position: [3, 0, 3], rotation: 1.2, scale: 2.5 },
  { model: '/models/seasonal/halloween/pumpkin_orange.gltf', position: [-3, 0, 3], rotation: 0.8, scale: 2.5 },

  // Spooky elements along paths
  { model: '/models/seasonal/halloween/skull.gltf', position: [6, 0, 1], rotation: 0.7, scale: 3 },
  { model: '/models/seasonal/halloween/skull_candle.gltf', position: [-6, 0, 0], rotation: -0.3, scale: 3 },
  { model: '/models/seasonal/halloween/candles.gltf', position: [4, 0, -3], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/candles_melted.gltf', position: [-4, 0, -5], rotation: 1.5, scale: 3 },
  { model: '/models/seasonal/halloween/bone_A.gltf', position: [8, 0, -3], rotation: 2.1, scale: 3 },
  { model: '/models/seasonal/halloween/ribcage.gltf', position: [-8, 0, -6], rotation: 0.4, scale: 3 },

  // Scarecrow + haybales at village
  { model: '/models/seasonal/halloween/scarecrow.gltf', position: [10, 0, 5], rotation: -1.2, scale: 3 },
  { model: '/models/seasonal/halloween/haybale.gltf', position: [11, 0, 4], rotation: 0.5, scale: 3 },
  { model: '/models/seasonal/halloween/haybale.gltf', position: [9, 0, 6], rotation: -0.8, scale: 3 },

  // Dead trees replace some normal trees visually
  { model: '/models/seasonal/halloween/tree_dead_large.gltf', position: [-10, 0, 8], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/tree_dead_medium.gltf', position: [12, 0, -6], rotation: 1.1, scale: 3 },
  { model: '/models/seasonal/halloween/tree_dead_decorated.gltf', position: [-12, 0, -3], rotation: -0.6, scale: 3 },

  // Graveyard extension
  { model: '/models/seasonal/halloween/grave_A.gltf', position: [-9, 0, -9], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/gravestone.gltf', position: [-8, 0, -10], rotation: 0.2, scale: 3 },
  { model: '/models/seasonal/halloween/crypt.gltf', position: [-11, 0, -11], rotation: 0.5, scale: 3 },

  // Lanterns along paths
  { model: '/models/seasonal/halloween/lantern_standing.gltf', position: [2, 0, 7], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/lantern_standing.gltf', position: [-2, 0, 7], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/lantern_hanging.gltf', position: [5, 0.8, -6], rotation: 0, scale: 3 },

  // Candy scattered around
  { model: '/models/seasonal/halloween/candycorn.gltf', position: [7, 0, 8], rotation: 0, scale: 3 },
  { model: '/models/seasonal/halloween/candy_bucket_A.gltf', position: [-5, 0, 9], rotation: 0.3, scale: 3 },

  // Fences
  { model: '/models/seasonal/halloween/fence.gltf', position: [6, 0, -8], rotation: 0.8, scale: 3 },
  { model: '/models/seasonal/halloween/fence_broken.gltf', position: [7, 0, -9], rotation: 0.8, scale: 3 },
  { model: '/models/seasonal/halloween/post_skull.gltf', position: [-6, 0, 7], rotation: 0, scale: 3 },
]

/** Christmas decorations scattered around the island */
export const CHRISTMAS_DECORATIONS: SeasonalDecoration[] = [
  // Christmas trees at plaza
  { model: '/models/seasonal/christmas/christmas_tree_decorated.gltf', position: [2, 0, 4], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/christmas_tree_decorated.gltf', position: [-2, 0, 4], rotation: 0.5, scale: 2.5 },

  // Presents around the trees
  { model: '/models/seasonal/christmas/present_A_red.gltf', position: [2.5, 0, 4.5], rotation: 0.3, scale: 3 },
  { model: '/models/seasonal/christmas/present_B_green.gltf', position: [1.5, 0, 4.8], rotation: -0.5, scale: 3 },
  { model: '/models/seasonal/christmas/present_C_blue.gltf', position: [2.8, 0, 3.5], rotation: 1.0, scale: 3 },
  { model: '/models/seasonal/christmas/present_D_yellow.gltf', position: [-1.5, 0, 4.3], rotation: 0.8, scale: 3 },
  { model: '/models/seasonal/christmas/present_E_white.gltf', position: [-2.5, 0, 4.7], rotation: -0.2, scale: 3 },

  // Candy canes along paths
  { model: '/models/seasonal/christmas/candycane_large.gltf', position: [4, 0, 2], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/candycane_large.gltf', position: [-4, 0, 2], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/candycane_small.gltf', position: [6, 0, 0], rotation: 0.4, scale: 3 },
  { model: '/models/seasonal/christmas/candycane_small.gltf', position: [-6, 0, 0], rotation: -0.4, scale: 3 },

  // Snowmen around the island
  { model: '/models/seasonal/christmas/snowman_A.gltf', position: [8, 0, 5], rotation: -0.8, scale: 3 },
  { model: '/models/seasonal/christmas/snowman_B.gltf', position: [-8, 0, 3], rotation: 0.6, scale: 3 },
  { model: '/models/seasonal/christmas/snowman_A.gltf', position: [3, 0, -8], rotation: 1.2, scale: 3 },
  { model: '/models/seasonal/christmas/snowball_pile.gltf', position: [9, 0, 4], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/snowball_pile.gltf', position: [-7, 0, 4], rotation: 0, scale: 3 },

  // Gingerbread man near the village
  { model: '/models/seasonal/christmas/gingerbread_man.gltf', position: [10, 0, 2], rotation: -0.5, scale: 3 },

  // Holiday treats
  { model: '/models/seasonal/christmas/hot_chocolate_decorated.gltf', position: [-3, 0, -5], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/cookie.gltf', position: [5, 0, -5], rotation: 0.7, scale: 3 },
  { model: '/models/seasonal/christmas/candy_peppermint.gltf', position: [-5, 0, -3], rotation: 0, scale: 3 },

  // Lanterns and bells
  { model: '/models/seasonal/christmas/lantern_decorated.gltf', position: [3, 0, 7], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/lantern_decorated.gltf', position: [-3, 0, 7], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/bells_decorated.gltf', position: [0, 0, 6], rotation: 0, scale: 3 },

  // Mistletoe and wreaths
  { model: '/models/seasonal/christmas/mistletoe_A.gltf', position: [7, 0.8, -2], rotation: 0, scale: 3 },
  { model: '/models/seasonal/christmas/wreath.gltf', position: [-7, 0.8, -2], rotation: 0, scale: 3 },

  // More presents scattered
  { model: '/models/seasonal/christmas/present_A_red.gltf', position: [12, 0, 8], rotation: 0.5, scale: 3 },
  { model: '/models/seasonal/christmas/present_C_blue.gltf', position: [-10, 0, -4], rotation: -0.3, scale: 3 },
  { model: '/models/seasonal/christmas/present_B_green.gltf', position: [6, 0, -10], rotation: 1.5, scale: 3 },
]
