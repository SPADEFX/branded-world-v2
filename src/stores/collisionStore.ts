import { create } from 'zustand'

// --- Collision config (shared, hardcoded) ---
// Edit this list to add/remove collision meshes. Toggles in the prop viewer
// work in-session only; update this list + commit to make changes permanent.
const COLLISION_ENABLED = new Set([
  'SM_Prop_Crate_02_1',
  'SM_Prop_Crate_01_1',
  'SM_Prop_Barrel_02_(1)',
  'SM_Prop_Barrel_01_(1)',
  'SM_Prop_Crate_01_2',
  'SM_Prop_Bench_Seat_01',
  'Seat',
  'SM_Env_Hedge_Shrub_01_(1)',
  'SM_Bld_Arch_01_(7)',
  'SM_Bld_Arch_02_(10)',
  'SM_Bld_Arch_02_(3)',
  'SM_Bld_Arch_02_(9)2',
  'SM_Bld_Bridge_01',
  'SM_Bld_Gazebo_01001',
  'SM_Bld_Gazebo_02_(2)',
  'SM_Env_Rock_Stairs_02_(26)',
  'SM_Env_Tree_Glowing_01',
  'SM_Prop_Fountain_01',
  'SM_Prop_Tent_01',
  'SM_Veh_Cart_01_1',
  'SM_Prop_BirdBath_01',
  'SM_Prop_Bundle_07',
  'SM_Prop_Bundle_08',
  'SM_Prop_Bundle_09',
  'SM_Prop_Bundle_10',
  'SM_Prop_Candle_Stand_01',
  'SM_Prop_Chair_01',
  'SM_Prop_Chair_02',
  'SM_Prop_Clock_Pole_01_(1)',
  'SM_Prop_Crate_03',
  'SM_Prop_Crate_05',
  'SM_Prop_Crate_06',
  'SM_Prop_Crate_07',
  'SM_Prop_Crate_08',
  'SM_Prop_Dock_Pole_01',
  'SM_Prop_Dock_Rope_01',
  'SM_Prop_Lamp_Post_01',
  'SM_Prop_Lantern_3',
  'SM_Prop_LanternStand_01',
  'SM_Prop_LogPile_01',
  'SM_Prop_Magic_Well_01',
  'SM_Prop_OfferingShrine_01',
  'SM_Prop_Ornament_01',
  'SM_Prop_Pedestal_02',
  'SM_Prop_Pot_01',
  'SM_Prop_Pot_02_(1)',
  'SM_Prop_Pot_Plant_01',
  'SM_Prop_Pot_Plant_02_(1)',
  'SM_Prop_Stool_01_(4)',
  'SM_Prop_Stool_02',
  'SM_Prop_Table_03',
  'SM_Prop_Trellis_01',
  'SM_Prop_Trellis_Swing_01',
  'SM_Prop_Vase_01',
  'SM_Prop_Vase_02',
  'SM_Prop_Vase_03',
])

// --- Hidden props config (shared, hardcoded) ---
const HIDDEN_PROPS = new Set<string>([
  // Add mesh baseNames here to hide them from the scene for everyone
])

const HIDDEN_KEY = 'prop-hidden-v1'

function loadHidden(): Set<string> {
  if (typeof window === 'undefined') return new Set(HIDDEN_PROPS)
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set(HIDDEN_PROPS)
  } catch { return new Set(HIDDEN_PROPS) }
}

function saveHidden(names: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...names]))
}

interface CollisionState {
  enabledNames: Set<string>
  version: number
  toggle: (name: string) => void
  disableAll: () => void
  hiddenNames: Set<string>
  toggleHidden: (name: string) => void
}

export const useCollisionStore = create<CollisionState>((set, get) => ({
  enabledNames: new Set(COLLISION_ENABLED),
  version: 0,
  toggle: (name) =>
    set((s) => {
      const next = new Set(s.enabledNames)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return { enabledNames: next, version: s.version + 1 }
    }),
  disableAll: () =>
    set(() => ({ enabledNames: new Set(), version: get().version + 1 })),
  hiddenNames: loadHidden(),
  toggleHidden: (name) =>
    set((s) => {
      const next = new Set(s.hiddenNames)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      saveHidden(next)
      return { hiddenNames: next }
    }),
}))
