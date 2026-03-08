// ---------------------------------------------------------------------------
// Model Catalog – single source of truth for every 3-D asset in the scene
// ---------------------------------------------------------------------------

export interface CatalogItem {
  id: string
  label: string
  path: string
  category: string
  defaultScale: number
}

// ── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES = [
  'pirate',
  'nature',
  'watercraft',
  'graveyard',
  'survival',
  'forest',
  'dungeon',
  'furniture',
  'resources',
] as const

// ── Texture helpers ─────────────────────────────────────────────────────────

export const TEXTURED_CATEGORIES = ['pirate', 'watercraft', 'graveyard', 'survival']

export function needsTexture(category: string): boolean {
  return TEXTURED_CATEGORIES.includes(category)
}

export function getColormapPath(category: string): string {
  return `/models/${category}/Textures/colormap.png`
}

// ── Label generation ────────────────────────────────────────────────────────

function toLabel(filename: string): string {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Helpers to build catalog entries ────────────────────────────────────────

/** Scale factors so every kit matches the Pirate Kit's visual size.
    Measured from GLB geometry bounds:
    - Pirate: barrel 1.23 tall, structure 2.2 tall (reference, scale 1)
    - Graveyard: ~2x smaller (crypt 0.73, gravestone 0.92)
    - Survival: ~3.5x smaller (barrel 0.34, tent 0.49)
    - Nature: ~2.7x smaller (tree_oak 1.23 at 0.64 wide)
    - Forest: ~1.5x (trees are large)
    - Dungeon: ~2x (similar to graveyard scale)
    - Furniture: ~3x (small household items)
    - Resources: ~3x (small items) */
const CATEGORY_SCALE: Record<string, number> = {
  nature: 2.7,
  graveyard: 2,
  survival: 3.5,
  forest: 1.5,
  dungeon: 2,
  furniture: 3,
  resources: 3,
}

function entry(category: string, prefix: string, filename: string, ext = '.glb'): CatalogItem {
  return {
    id: `${category}--${filename}`,
    label: toLabel(filename),
    path: `${prefix}${filename}${ext}`,
    category,
    defaultScale: CATEGORY_SCALE[category] ?? 1,
  }
}

function entries(category: string, prefix: string, filenames: string[], ext = '.glb'): CatalogItem[] {
  return filenames.map((f) => entry(category, prefix, f, ext))
}

// ── Pirate ──────────────────────────────────────────────────────────────────

const pirate = entries('pirate', '/models/pirate/', [
  'barrel',
  'boat-row-large',
  'boat-row-small',
  'bottle',
  'cannon',
  'chest',
  'crate',
  'crate-bottles',
  'flag',
  'flag-pirate',
  'mast',
  'palm-bend',
  'palm-detailed-bend',
  'palm-straight',
  'platform-planks',
  'rocks-sand-a',
  'rocks-sand-b',
  'rocks-sand-c',
  'ship-wreck',
  'structure',
  'structure-fence',
  'structure-platform-dock',
  'structure-platform-dock-small',
  'structure-roof',
  'tool-paddle',
  'tool-shovel',
  'tower-watch',
])

// ── Nature ──────────────────────────────────────────────────────────────────

const nature = entries('nature', '/models/nature/', [
  'campfire_stones',
  'fence_simple',
  'flower_purpleA',
  'flower_redA',
  'flower_yellowA',
  'grass',
  'grass_large',
  'log',
  'plant_bush',
  'plant_bushLarge',
  'rock_largeA',
  'rock_smallA',
  'rock_tallA',
  'stump_round',
  'tree_detailed',
  'tree_fat',
  'tree_oak',
  'tree_palmShort',
  'tree_pineRoundA',
])

// ── Watercraft ──────────────────────────────────────────────────────────────

const watercraft = entries('watercraft', '/models/watercraft/', [
  'boat-fishing-small',
  'boat-row-small',
  'boat-sail-a',
  'buoy',
  'buoy-flag',
])

// ── Graveyard ───────────────────────────────────────────────────────────────

const graveyard = entries('graveyard', '/models/graveyard/', [
  'altar-stone',
  'altar-wood',
  'bench',
  'bench-damaged',
  'border-pillar',
  'brick-wall',
  'brick-wall-curve',
  'brick-wall-curve-small',
  'brick-wall-end',
  'candle',
  'candle-multiple',
  'character-ghost',
  'character-keeper',
  'character-skeleton',
  'character-vampire',
  'character-zombie',
  'coffin',
  'coffin-old',
  'column-large',
  'cross',
  'cross-column',
  'cross-wood',
  'crypt',
  'crypt-a',
  'crypt-b',
  'crypt-door',
  'crypt-large',
  'crypt-large-door',
  'crypt-large-roof',
  'crypt-small',
  'crypt-small-roof',
  'debris',
  'debris-wood',
  'detail-bowl',
  'detail-chalice',
  'detail-plate',
  'fence',
  'fence-damaged',
  'fence-gate',
  'fire-basket',
  'grave',
  'grave-border',
  'gravestone-bevel',
  'gravestone-broken',
  'gravestone-cross',
  'gravestone-cross-large',
  'gravestone-debris',
  'gravestone-decorative',
  'gravestone-roof',
  'gravestone-round',
  'gravestone-wide',
  'hay-bale',
  'hay-bale-bundled',
  'iron-fence',
  'iron-fence-bar',
  'iron-fence-border',
  'iron-fence-border-column',
  'iron-fence-border-curve',
  'iron-fence-border-gate',
  'iron-fence-curve',
  'iron-fence-damaged',
  'lantern-candle',
  'lantern-glass',
  'lightpost-all',
  'lightpost-double',
  'lightpost-single',
  'pillar-large',
  'pillar-obelisk',
  'pillar-small',
  'pillar-square',
  'pine',
  'pine-crooked',
  'pine-fall',
  'pine-fall-crooked',
  'pumpkin',
  'pumpkin-carved',
  'pumpkin-tall',
  'pumpkin-tall-carved',
  'road',
  'rocks',
  'rocks-tall',
  'shovel',
  'shovel-dirt',
  'stone-wall',
  'stone-wall-column',
  'stone-wall-curve',
  'stone-wall-damaged',
  'trunk',
  'trunk-long',
  'urn-round',
  'urn-square',
])

// ── Survival ────────────────────────────────────────────────────────────────

const survival = entries('survival', '/models/survival/', [
  'barrel',
  'barrel-open',
  'bedroll',
  'bedroll-frame',
  'bedroll-packed',
  'bottle',
  'bottle-large',
  'box',
  'box-large',
  'box-large-open',
  'box-open',
  'bucket',
  'campfire-fishing-stand',
  'campfire-pit',
  'campfire-stand',
  'chest',
  'fence',
  'fence-doorway',
  'fence-fortified',
  'fish',
  'fish-large',
  'floor',
  'floor-hole',
  'floor-old',
  'grass',
  'grass-large',
  'metal-panel',
  'metal-panel-narrow',
  'metal-panel-screws',
  'metal-panel-screws-half',
  'metal-panel-screws-narrow',
  'patch-grass',
  'patch-grass-large',
  'resource-planks',
  'resource-stone',
  'resource-stone-large',
  'resource-wood',
  'rock-a',
  'rock-b',
  'rock-c',
  'rock-flat',
  'rock-flat-grass',
  'rock-sand-a',
  'rock-sand-b',
  'rock-sand-c',
  'signpost',
  'signpost-single',
  'structure',
  'structure-canvas',
  'structure-floor',
  'structure-metal',
  'structure-metal-doorway',
  'structure-metal-floor',
  'structure-metal-roof',
  'structure-metal-wall',
  'structure-roof',
  'tent',
  'tent-canvas',
  'tent-canvas-half',
  'tool-axe',
  'tool-axe-upgraded',
  'tool-hammer',
  'tool-hammer-upgraded',
  'tool-hoe',
  'tool-hoe-upgraded',
  'tool-pickaxe',
  'tool-pickaxe-upgraded',
  'tool-shovel',
  'tool-shovel-upgraded',
  'tree',
  'tree-autumn',
  'tree-autumn-tall',
  'tree-autumn-trunk',
  'tree-log',
  'tree-log-small',
  'tree-tall',
  'tree-trunk',
  'workbench',
  'workbench-anvil',
  'workbench-grind',
])

// ── Forest ──────────────────────────────────────────────────────────────────

const forest = entries('forest', '/models/kaykit/forest/', [
  'Bush_1_A_Color1',
  'Bush_2_A_Color1',
  'Bush_3_A_Color1',
  'Bush_4_A_Color1',
  'Grass_1_A_Color1',
  'Grass_2_A_Color1',
  'Hill_2x2x2_Color1',
  'Hill_4x4x4_Color1',
  'Hill_8x8x4_Color1',
  'Rock_1_A_Color1',
  'Rock_2_A_Color1',
  'Rock_3_A_Color1',
  'Rock_4_A_Color1',
  'Rock_5_A_Color1',
  'Rock_6_A_Color1',
  'Tree_1_A_Color1',
  'Tree_2_A_Color1',
  'Tree_3_A_Color1',
  'Tree_4_A_Color1',
  'Tree_5_A_Color1',
  'Tree_6_A_Color1',
  'Tree_7_A_Color1',
  'Tree_Bare_1_A_Color1',
], '.gltf')

// ── Dungeon ─────────────────────────────────────────────────────────────────

const dungeon = entries('dungeon', '/models/kaykit/dungeon/', [
  'barrel_large',
  'barrel_small',
  'candle_lit',
  'candle_triple',
  'chest_gold',
  'floor_tile_large',
  'keg_decorated',
  'torch_lit',
  'trunk_medium_A',
  'wall_doorway',
  'wall_pillar',
], '.gltf')

// ── Furniture ───────────────────────────────────────────────────────────────

const furniture = entries('furniture', '/models/kaykit/furniture/', [
  'armchair',
  'bed_single_A',
  'book_set',
  'cactus_medium_A',
  'chair_A',
  'couch',
  'desk',
  'lamp_desk',
  'lamp_standing',
  'monitor',
  'mug_A',
  'rug_rectangle_A',
  'shelf_A_big',
  'table_medium',
], '.gltf')

// ── Resources ───────────────────────────────────────────────────────────────

const resources = entries('resources', '/models/kaykit/resources/', [
  'Containers_Box_Large',
  'Containers_Crate_Large',
  'Food_Apple_Red',
  'Food_Barrel_Fish',
  'Food_Cheese',
  'Gem_Large',
  'Gem_Medium',
  'Gem_Small',
  'Gems_Chest',
  'Gems_Pile_Large',
  'Gold_Bar',
  'Gold_Bars',
  'Gold_Nugget_Large',
  'Money_Coins_Stack_Large',
  'Money_Pile_Large',
  'Wood_Log_Stack',
], '.gltf')

// ── Full catalog ────────────────────────────────────────────────────────────

export const MODEL_CATALOG: CatalogItem[] = [
  ...pirate,
  ...nature,
  ...watercraft,
  ...graveyard,
  ...survival,
  ...forest,
  ...dungeon,
  ...furniture,
  ...resources,
]
