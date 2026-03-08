# branded-world

3D interactive marketing website for a memecoin project. Think "walk around an island and discover content zones."

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **3D**: React Three Fiber v9 + @react-three/drei + Three.js r170
- **State**: Zustand v5
- **Styling**: Tailwind CSS v4, framer-motion
- **Language**: TypeScript 5.7

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npx tsc --noEmit # Type-check without building
```

## Architecture

### Source Structure

```
src/
├── app/                    # Next.js app router (layout + page)
├── components/
│   ├── canvas/             # All 3D components (R3F)
│   │   ├── Experience.tsx  # Canvas root — mounts all 3D components
│   │   ├── World.tsx       # Terrain, water, all static objects (biggest file)
│   │   ├── Player.tsx      # Player controller (WASD + gamepad + touch)
│   │   ├── NPCs.tsx        # NPC system with animations + hand props
│   │   ├── CameraRig.tsx   # Third-person camera follow
│   │   ├── Collectibles.tsx # Gem/coin pickup system
│   │   ├── InteractionZones.tsx # Proximity-triggered UI zones
│   │   ├── SeasonalDecorations.tsx # Halloween/Christmas auto-switch
│   │   ├── Lighting.tsx    # Sun, shadows, fog
│   │   ├── SolanaMonument.tsx # Central monument
│   │   ├── FootstepDust.tsx # Particle effect
│   │   └── Editor*.tsx / Hitbox*.tsx / DynamicObjects / Placement # Editor system
│   └── ui/                 # 2D overlay components (React DOM)
│       ├── Modal.tsx       # Zone content modals
│       ├── DialogueBox.tsx # NPC dialogue system
│       ├── HUD.tsx         # Score, gem counter
│       ├── Editor*.tsx     # Editor panels
│       └── Onboarding.tsx  # First-visit tutorial
├── config/
│   ├── zones.ts            # 5 interaction zones (positions + content)
│   ├── npcs.ts             # 21 NPCs (positions, models, dialogue, props)
│   ├── collectibles.ts     # 29 collectibles (gems, gold, coins)
│   ├── seasonal.ts         # Halloween + Christmas decoration configs
│   ├── modelCatalog.ts     # Editor model browser catalog
│   └── hitboxOverrides.ts  # Per-model collision box overrides
├── lib/
│   ├── worldShape.ts       # Continent polygon, point-in-polygon, biome detection
│   ├── hitboxes.ts         # AABB collision system
│   ├── playerRef.ts        # Mutable player position (shared between components)
│   └── thumbnailRenderer.ts
├── stores/
│   ├── gameStore.ts        # Game state (modals, dialogue, collectibles, score)
│   └── editorStore.ts      # Editor state (selection, model registry)
├── hooks/
│   └── useInput.ts         # Keyboard/gamepad/touch input
└── types/
    └── index.ts            # Shared TypeScript types
```

### 3D Assets (`public/models/`)

```
models/
├── character/              # 24 KayKit character GLBs
│   └── anims/              # 8 animation pack GLBs
├── nature/                 # Kenney Nature Kit GLBs (trees, rocks, flowers)
├── pirate/                 # Kenney Pirate Kit GLBs + Textures/colormap.png
├── watercraft/             # Kenney Watercraft GLBs + Textures/colormap.png
├── props/
│   ├── weapons/            # 16 weapon GTLFs
│   └── tools/              # 17 tool GLTFs
├── kaykit/
│   ├── forest/             # 23 GLTFs + forest_texture.png (trees, bushes, rocks, hills)
│   ├── dungeon/            # 11 GLTFs
│   ├── furniture/          # 14 GLTFs
│   └── resources/          # 16 GLTFs (gems, gold, coins)
└── seasonal/
    ├── halloween/          # 21 GLTFs + halloweenbits_texture.png
    └── christmas/          # 18 GLTFs + holiday_bits_texture.png
```

## Key Concepts

### World Geometry (`worldShape.ts`)

The map is an **irregular polygon continent** (~55 unit radius) + a **secondary island** (at ~70,30) connected by a **bridge**.

- `CONTINENT_POLY` — 23 vertices defining the main landmass
- `SECONDARY_ISLAND_POLY` — 8 vertices for the small island
- `isInsideLand(x, z)` — checks continent OR island OR bridge (player boundary)
- `distanceToShore(x, z)` — signed distance (positive = on land)
- `getBiome(x, z)` — returns `'village'` (center, r<18), `'forest'` (default), `'beach'` (south), `'mountain'` (north)

### Terrain Rendering (`World.tsx`)

- **Island**: PlaneGeometry(200x200) with vertices outside polygon sunk to Y=-5. Biome vertex colors.
- **Water**: PlaneGeometry(300x300) with custom GLSL shaders. Per-vertex `aShoreDist` attribute drives foam, waves, transparency.
- **ForestBarrier / MountainBarrier**: Procedural placement of KayKit forest models near coastline (decorative only — boundary is code-based).
- **Bridge**: Pirate platform-planks segments connecting continent to secondary island.

### Model Components

- `M` component — for GLB/GLTF models with flat colors (Nature kit). Clones scene, forces metalness=0.
- `Tex` component — for textured models (Pirate/Watercraft kits). Applies shared colormap texture.
- Both register with the editor system and hitbox collision.

### Player (`Player.tsx`)

- Camera-relative movement (WASD transforms relative to camera direction)
- Polygon boundary via `isInsideLand()` — pushes back to last valid position
- Jump with gravity, animation crossfading (idle/run/jump)
- Spawn at `[0, 0, 20]`

### NPC System (`NPCs.tsx` + `npcs.ts`)

- 21 NPCs with KayKit character models
- Activities: idle, wander, guard, magic, sneak, combat, wave, sit, fish, bow, hammer, cheer
- Hand props via bone attachment (handslot.l / handslot.r)
- Dialogue system with proximity trigger

### Collectibles (`Collectibles.tsx`)

- Single `useFrame` drives all collectibles (no per-item lights or callbacks)
- Floating + spinning animation, proximity pickup
- Score tracking in gameStore

### Editor System

- Toggle with backtick key
- Click to select models, drag to reposition
- Model catalog browser for placing new objects
- Hitbox visualization toggle

## Important Patterns

- **KayKit GLTF models** use `.gltf` + `.bin` + shared texture (e.g. `forest_texture.png`). Extension handled by regex `/\.gl(b|tf)$/` in ID generation.
- **Kenney GLB models** have embedded `baseColorFactor` colors, no external texture, but `metallicFactor=1` which needs to be forced to 0.
- **Pirate/Watercraft GLBs** need a manually loaded colormap texture applied to all meshes.
- **Performance**: Avoid per-object `useFrame` or `pointLight`. Use shared callbacks, emissive materials, squared distance checks.
- **Seasonal**: Auto-detects Halloween (Oct 1–Nov 5) / Christmas (Dec 1–Jan 5), only loads relevant models.

## Current State

The world is a large irregular continent with 4 biomes:
- **Village** (center) — structures, plaza, monument, NPCs
- **Forest** (ring) — scattered trees near edges, walkable
- **Beach** (south) — harbor, docks, boats, palms
- **Mountain** (north) — rocks, hills
- **Secondary island** (east) — connected by bridge, forest + collectibles

Player boundary is handled entirely by polygon code in `isInsideLand()`, not by physical tree walls.
