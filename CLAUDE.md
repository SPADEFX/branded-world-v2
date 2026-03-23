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
│   │   ├── Environment.tsx # Loads terrain.glb + environment.glb + buildings.glb, applies materials, autoInstance, BVH
│   │   ├── World.tsx       # Procedural terrain (polygon island), water shader, forest/beach decorations
│   │   ├── Player.tsx      # Player controller (WASD + gamepad + touch + ground raycasting)
│   │   ├── NPCs.tsx        # NPC system with animations + hand props
│   │   ├── CameraRig.tsx   # Third-person camera follow + obstruction fade
│   │   ├── DistanceCuller.tsx # Hides non-instanced singleton meshes beyond 200u (visualMeshes ref)
│   │   ├── TeleportGhost.tsx  # Editor TP mode — wireframe ghost + click to teleport
│   │   ├── InteractionZones.tsx # Proximity-triggered UI zones
│   │   ├── SeasonalDecorations.tsx # Halloween/Christmas auto-switch
│   │   ├── Lighting.tsx    # Sun, shadows, fog
│   │   ├── FootstepDust.tsx # Particle effect
│   │   └── Editor*.tsx / Hitbox*.tsx / DynamicObjects / Placement # Editor system
│   └── ui/                 # 2D overlay components (React DOM)
│       ├── Modal.tsx       # Zone content modals
│       ├── DialogueBox.tsx # NPC dialogue system
│       ├── HUD.tsx         # Discovery counter + interaction prompt (no collectibles)
│       ├── EditorSidebar.tsx # Editor panel (Move/Rotate/Eraser/TP/Save)
│       └── Onboarding.tsx  # First-visit tutorial
├── config/
│   ├── zones.ts            # 5 interaction zones (positions + content)
│   ├── npcs.ts             # NPC configs (positions, models, dialogue, props)
│   ├── seasonal.ts         # Halloween + Christmas decoration configs
│   ├── modelCatalog.ts     # Editor model browser catalog
│   └── hitboxOverrides.ts  # Per-model collision box overrides
├── lib/
│   ├── worldShape.ts       # Continent polygon, point-in-polygon, biome detection
│   ├── hitboxes.ts         # AABB collision system
│   ├── testMapRef.ts       # testMapScene (Object3D[]) + visualMeshes (Mesh[]) shared refs
│   ├── playerRef.ts        # playerPosition, playerRotation, teleportTarget shared mutable refs
│   ├── autoInstance.ts     # Groups meshes by geo+material into InstancedMesh (THRESHOLD=2)
│   ├── cliffMaterial.ts    # Custom cliff shader material
│   ├── waterMaterial.ts    # Animated water surface material
│   └── waterfallMaterial.ts # Waterfall stream + pool materials
├── stores/
│   ├── gameStore.ts        # Game state (modals, dialogue, zones, onboarding, joystick)
│   └── editorStore.ts      # Editor state (selection, cameraMode, eraserMode, teleportMode)
├── hooks/
│   └── useInput.ts         # Keyboard/gamepad/touch input
└── types/
    └── index.ts            # Shared TypeScript types
```

### 3D Assets (`public/models/`)

```
models/
├── terrain.glb             # Base terrain mesh (no autoInstance, no BVH needed for visuals)
├── environment.glb         # All env objects: rocks, paths, cliffs, water, waterfalls, trees
├── buildings.glb           # All buildings — processed with gltf-transform join + draco
├── character/              # 24 KayKit character GLBs
│   └── anims/              # 8 animation pack GLBs
├── nature/                 # Kenney Nature Kit GLBs (trees, rocks, flowers)
├── pirate/                 # Kenney Pirate Kit GLBs + Textures/colormap.png
├── watercraft/             # Kenney Watercraft GLBs + Textures/colormap.png
├── kaykit/
│   ├── forest/             # 23 GLTFs + forest_texture.png
│   ├── dungeon/            # 11 GLTFs
│   ├── furniture/          # 14 GLTFs
│   └── resources/          # 16 GLTFs
└── seasonal/
    ├── halloween/           # 21 GLTFs + halloweenbits_texture.png
    └── christmas/           # 18 GLTFs + holiday_bits_texture.png
```

---

## 3D Asset Pipeline (Blender → Game)

### Source

The map is built in **Blender**. The Blender file has 4 main collections:
- **Buildings** — all structures (towers, houses, castles...). Assets are **linked** from a source `.glb` (imported from Unreal Engine), which means they CANNOT be joined in Blender (Join is greyed out).
- **Environment** — rocks, paths, cliffs, terrain details, water planes, waterfalls (~4k objects)
- **Terrain** — base terrain mesh
- **Misc** — decorations, set dressing, LOD variants (LOD_SetDress items are low-poly versions)

### Export from Blender

Export each collection separately as GLB:
1. Select only the objects of that collection (use camera icon to hide others)
2. File → Export → glTF 2.0
3. Export settings: **Selected Objects only**, **Apply Transformations ON**, Draco compression ON (quality 6, speed 6)

### Post-export optimization (CLI)

```bash
# ONLY use join on buildings.glb — NOT on environment.glb or terrain.glb
# join merges meshes sharing the same material → huge draw call reduction for buildings
npx @gltf-transform/cli join buildings.glb buildings.glb

# Re-compress after join (join decodes Draco, inflating file size)
npx @gltf-transform/cli draco buildings.glb buildings.glb
```

**⚠️ NEVER run `gltf-transform join` on environment.glb or terrain.glb.**
environment.glb uses name-based material assignment (cliff, water, waterfall). Joining destroys mesh names → materials get applied to wrong geometry → 2 FPS + visual corruption.

### Why `join` works on buildings but not environment

- Buildings: many unique meshes sharing the same material → merging reduces draw calls from ~9000 to ~76
- Environment: meshes have unique names used by code to assign custom materials (waterMaterial, cliffMaterial, etc.) → names must be preserved

---

## Collision & Raycasting System

### `testMapScene` (`src/lib/testMapRef.ts`)

`testMapScene.current` is a `THREE.Object3D[]` array containing the scenes used for raycasting. Currently `[env, buildings]`.

- **Player** raycasts downward for ground snapping (`getGroundHeight`) and sideways for wall collision (`resolveWalls`)
- **NPCs** raycast downward for ground Y (`getGroundY`)
- **CameraRig** raycasts from player toward camera for obstruction fade

All raycasting uses `intersectObjects(testMapScene.current, true)` — NOT `intersectObject`.

### BVH acceleration (`three-mesh-bvh`)

After loading and instancing each scene, `buildBVH(scene)` is called in `Environment.tsx`. This patches `THREE.Mesh.prototype.raycast` (once, at module level) with the BVH accelerated version.

**Without BVH**: raycasting on large joined meshes is O(n triangles) → 3 FPS.
**With BVH**: O(log n) → no performance impact.

The patch is applied once via:
```ts
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast
```

Then `buildBVH(scene)` traverses and calls `geo.computeBoundsTree()` on each mesh that doesn't already have one.

### `visualMeshes` and `DistanceCuller`

`autoInstance(env)` returns the **singleton meshes** (not instanced — unique geometry). These are stored in `visualMeshes.current` (filtered: no collision meshes, no water planes).

`DistanceCuller` hides these singletons when they're more than 200 units from the player. This saves draw calls for far-away decorative objects. The threshold is 200u (not lower — the map is ~55u radius, so 75u was too small and caused env to disappear at edges).

### Collision mesh names

Meshes matching these patterns are used for raycasting but NOT rendered by DistanceCuller:
```
SM_Env_Rock, SM_Env_Ground, SM_Env_Path, SM_Env_Cliff,
SM_Env_Stairs, SM_Env_Floor, SM_Env_Terrain, SM_Env_Footpath,
SM_Env_Bridge, SM_Bld_Floor
```

---

## Performance Optimization

### autoInstance (`src/lib/autoInstance.ts`)

Groups meshes in a scene by `geometry.uuid + material.uuid`. If a group has ≥2 members, replaces them with a single `InstancedMesh`. Returns the leftover singletons.

- **Good for**: environment.glb (lots of repeated rocks, trees, props)
- **Already handled by gltf-transform join for**: buildings.glb (unique geometry, same material)

### Draw call budget

After full optimization pipeline:
- terrain.glb: ~10 draw calls
- environment.glb (after autoInstance): ~300 draw calls
- buildings.glb (after gltf-transform join): ~76 draw calls
- Total: ~388 draw calls at ~180 FPS

### Material setup

In `Environment.tsx` `useEffect`:
- **Cliff meshes** (`isCliff(name)`): replaced with `cliffMaterial` (custom shader)
- **Waterfall stream** (`fx_waterfall` in name): `waterfallStreamMaterial`
- **Waterfall pool** (`water_plane_waterfall` in name): `waterfallPoolMaterial`
- **Water planes** (`water_plane` or `water_dip`, not waterfall): `waterMaterial` — applied after autoInstance to the resulting InstancedMesh
- **Ground meshes**: `castShadow = false`, `receiveShadow = true`, `metalness=0`, `roughness=0.9`
- **Buildings**: `castShadow = true`, `receiveShadow = true`, `metalness=0`, `roughness=0.9`, **`emissiveIntensity=0`** (some UE materials have emissive that causes green glow with bloom)

---

## Player System

### Ground snapping (`Player.tsx`)

3-tier smooth ground-following to handle stairs without micro-hops:
```ts
const gap = groundH - smoothGroundH.current
if (gap > 0.05)       → lerp at 20*dt  (climbing stair: fast snap up)
else if (gap > -0.05) → lerp at 5*dt   (flat/micro bumps: slow smooth)
else                  → snap instantly  (falling off edge)
```

`smoothGroundH` resets to `null` when airborne, re-initializes on first ground contact.

### Teleport (`teleportTarget` in `playerRef.ts`)

Set `teleportTarget.current = { x, y, z }` from anywhere. Player consumes it on the next frame, snaps position, resets velocities and `smoothGroundH`.

Used by the editor TP mode (`TeleportGhost.tsx`).

---

## Editor System

Toggle with backtick key. Camera modes: Follow / Top-down / Free orbit.

**Teleport mode (TP button)**: Raycasts against `testMapScene` on mouse move, shows a green wireframe capsule ghost. Click to teleport the player. Useful for testing areas far from spawn or finding floating buildings.

**Eraser mode**: Click any object to delete/hide it.

**Save**: Persists object positions + hidden IDs to localStorage.

---

## Key Concepts

### World Geometry (`worldShape.ts`)

The map is an **irregular polygon continent** (~55 unit radius) + a **secondary island** (at ~70,30) connected by a **bridge**.

- `isInsideLand(x, z)` — checks continent OR island OR bridge (player boundary)
- `distanceToShore(x, z)` — signed distance (positive = on land)
- `getBiome(x, z)` — returns `'village'` (center, r<18), `'forest'` (default), `'beach'` (south), `'mountain'` (north)

Player boundary is handled entirely by polygon code in `isInsideLand()`, not by physical walls.

### NPC System (`NPCs.tsx` + `npcs.ts`)

- KayKit character models
- Activities: idle, wander, guard, magic, sneak, combat, wave, sit, fish, bow, hammer, cheer
- Hand props via bone attachment (handslot.l / handslot.r)
- Dialogue system with proximity trigger

### Important Patterns

- **Avoid `gltf-transform join` on environment.glb** — destroys name-based material assignment
- **Always BVH after instancing** — call `buildBVH(scene)` after `autoInstance(scene)` or any geometry is finalized
- **testMapScene is an array** — use `intersectObjects(testMapScene.current, true)` never `intersectObject`
- **Buildings from Blender are linked assets** — cannot Join in Blender, use `gltf-transform join` on the GLB directly
- **emissiveIntensity = 0 for buildings** — UE-sourced materials often have non-zero emissive, causes bloom glow
- **DistanceCuller threshold ≥ 200** — map is 55u radius, smaller values cause env to vanish at edges
- **KayKit GLTF models** use `.gltf` + `.bin` + shared texture. Extension handled by regex `/\.gl(b|tf)$/`
- **Kenney GLB models** have `metallicFactor=1` — must force `metalness=0`
- **Seasonal**: Auto-detects Halloween (Oct 1–Nov 5) / Christmas (Dec 1–Jan 5)

### Removed Systems

- **Collectibles** — `Collectibles.tsx` and `config/collectibles.ts` deleted. `gameStore` no longer has `collectedIds`, `score`, `lastCollected`, `collectItem`. HUD no longer shows gem counter.
