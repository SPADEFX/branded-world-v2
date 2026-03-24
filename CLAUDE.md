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
│   │   ├── Experience.tsx  # Canvas root — mounts all 3D components (far=2000)
│   │   ├── Environment.tsx # Loads all 5 GLBs, applies materials, autoInstance, BVH
│   │   ├── Player.tsx      # Player controller (WASD + gamepad + touch + ground raycasting)
│   │   ├── NPCs.tsx        # NPC system with animations + hand props
│   │   ├── CameraRig.tsx   # Third-person follow + pointer-lock mouse mode + obstruction fade
│   │   ├── DistanceCuller.tsx # Dual-threshold culling: 200u (visualMeshes) / 15u (setDressMeshes)
│   │   ├── TeleportGhost.tsx  # Editor TP mode — wireframe ghost + click to teleport
│   │   ├── InteractionZones.tsx # Proximity-triggered UI zones
│   │   ├── SeasonalDecorations.tsx # Halloween/Christmas auto-switch
│   │   ├── Lighting.tsx    # Sun, shadows, fog
│   │   ├── FootstepDust.tsx # Particle effect
│   │   ├── DoorPlacer.tsx  # Place door triggers on building walls (editor tool)
│   │   ├── DoorTriggers.tsx # Renders + manages placed door triggers
│   │   ├── DoorViewer.tsx  # Visual preview of placed doors (x-ray/full/wireframe)
│   │   ├── EditorCamera.tsx # Free orbit + top-down views; activates on freeCamActive or viewDoorsMode
│   │   └── Editor*.tsx / Hitbox*.tsx / DynamicObjects # Editor system
│   └── ui/                 # 2D overlay components (React DOM)
│       ├── Modal.tsx       # Zone content modals
│       ├── DialogueBox.tsx # NPC dialogue system
│       ├── HUD.tsx         # Discovery counter + interaction prompt
│       ├── BottomNav.tsx   # Bottom navbar: Caméra libre / Portes (fantasy dark style)
│       ├── DoorsSidebar.tsx # Doors panel — list, view style, place/export
│       ├── GraphicsDashboard.tsx # Graphics settings: bloom, shadows, camera mode
│       ├── EditorSidebar.tsx # Editor panel (Move/Rotate/Eraser/TP/Save)
│       └── Onboarding.tsx  # First-visit tutorial
├── config/
│   ├── zones.ts            # 5 interaction zones (positions + content)
│   ├── npcs.ts             # NPC configs (positions, models, dialogue, props)
│   ├── indoorZones.ts      # Door trigger types + export helper
│   ├── seasonal.ts         # Halloween + Christmas decoration configs
│   ├── modelCatalog.ts     # Editor model browser catalog
│   └── hitboxOverrides.ts  # Per-model collision box overrides
├── lib/
│   ├── worldShape.ts       # Continent polygon, point-in-polygon, biome detection
│   ├── hitboxes.ts         # AABB collision system
│   ├── testMapRef.ts       # testMapScene, visualMeshes, fadeScenesRef, buildingScenesRef, setDressMeshes
│   ├── playerRef.ts        # playerPosition, playerRotation, teleportTarget, freeCameraJumpTarget
│   ├── autoInstance.ts     # Groups meshes by geo+material into InstancedMesh (THRESHOLD=2)
│   ├── cliffMaterial.ts    # Custom cliff shader material
│   ├── waterMaterial.ts    # Animated water surface material
│   └── waterfallMaterial.ts # Waterfall stream + pool materials
├── stores/
│   ├── gameStore.ts        # Game state (modals, dialogue, zones, onboarding, joystick)
│   ├── editorStore.ts      # Editor state + freeCamActive + viewDoorsMode + placedDoors
│   └── graphicsStore.ts    # Graphics settings: bloom, shadows, camControlMode ('keyboard'|'mouse')
├── hooks/
│   └── useInput.ts         # Keyboard/gamepad/touch input
└── types/
    └── index.ts            # Shared TypeScript types
```

### 3D Assets (`public/models/`)

```
models/
├── terrain.glb             # Base terrain mesh (no autoInstance, no BVH)
├── environment.glb         # Env objects: rocks, paths, cliffs, water, waterfalls, trees
├── buildings.glb           # All buildings — processed with gltf-transform join + draco
├── Globalmisc.glb          # Misc props (stairs, statues, fountains…) — autoInstance + BVH
├── Setdress.glb            # House interior decorations — culled at 15u, start hidden
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
# Step 1 — resize textures (UE assets often export at 4096x4096 → GPU OOM → blob: errors)
npx @gltf-transform/cli resize --width 2048 --height 2048 <file>.glb <file>.glb

# Step 2 — join (buildings ONLY — reduces ~9000 draw calls → ~76)
npx @gltf-transform/cli join buildings.glb buildings.glb

# Step 3 — recompress geometry (join/resize decode Draco, inflating file size)
npx @gltf-transform/cli draco <file>.glb <file>.glb
```

**⚠️ NEVER run `gltf-transform join` on environment.glb, Globalmisc.glb, or Setdress.glb.**
environment.glb uses name-based material assignment (cliff, water, waterfall). Joining destroys mesh names → materials get applied to wrong geometry → 2 FPS + visual corruption.

**⚠️ Always resize to 2048 before draco.**
4096×4096 WebP textures = 89 MB GPU each. Loading many simultaneously causes `THREE.GLTFLoader: Couldn't load texture blob:` errors and white materials. 2048×2048 = 22 MB GPU, no failures.

### Why `join` works on buildings but not environment

- Buildings: many unique meshes sharing the same material → merging reduces draw calls from ~9000 to ~76
- Environment/Misc/Setdress: meshes have unique names used by code to assign custom materials (waterMaterial, cliffMaterial, etc.) → names must be preserved

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

`DistanceCuller` runs two independent culling passes every 10 frames:
- **`visualMeshes`** — hidden beyond **200u** (env singletons). Not lower — map is ~55u radius, 75u caused env to vanish at edges.
- **`setDressMeshes`** — hidden beyond **15u** (house decorations from Setdress.glb). Start `visible=false`, revealed on proximity.

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
- Globalmisc.glb (after autoInstance): ~88 draw calls
- Setdress.glb: ~29 draw calls (mostly hidden)
- Total: ~439 draw calls at ~140+ FPS

### Material setup

In `Environment.tsx` `useEffect`:
- **Cliff meshes** (`isCliff(name)`): replaced with `cliffMaterial` (custom shader)
- **Waterfall stream** (`fx_waterfall` in name): `waterfallStreamMaterial`
- **Waterfall pool** (`water_plane_waterfall` in name): `waterfallPoolMaterial`
- **Water planes** (`water_plane` or `water_dip`, not waterfall): `waterMaterial` — applied after autoInstance to the resulting InstancedMesh
- **Ground meshes**: `castShadow = false`, `receiveShadow = true`, `metalness=0`, `roughness=0.9`
- **Buildings + Globalmisc**: `metalness=0`, `roughness=0.9`, **`emissiveIntensity=0`** (UE materials have non-zero emissive → bloom glow)
- **Setdress**: `metalness=0`, `roughness=0.9`, `emissiveIntensity=0`, **`visible=false`** on init
- **Do NOT set `emissiveIntensity=0` on env meshes** — some use emissive as primary color

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

## Camera System

### Third-person follow (`CameraRig.tsx`)

Default mode. Follows player with orbit + obstruction fade. Skips if `freeCamActive || viewDoorsMode`.

Two control modes (toggled in Graphics settings):
- **ZQSD** (`camControlMode: 'keyboard'`): right-click drag to rotate (default)
- **Souris** (`camControlMode: 'mouse'`): click canvas to lock pointer, mouse movement rotates camera. ESC to unlock.

### Free camera (`EditorCamera.tsx`)

Activates when `freeCamActive || viewDoorsMode` (even without full editor). Always initializes at current player position. Uses R3F `OrbitControls`.

`freeCameraJumpTarget.current = { x, y, z }` — set from anywhere to jump the free cam to a position (used by DoorsSidebar row click).

### Editor (`EditorCamera.tsx` + editor store)

Toggle with backtick key. Camera modes: Follow / Top-down / Free orbit.

**Teleport mode (TP button)**: Raycasts against `testMapScene` on mouse move, shows a green wireframe capsule ghost. Click to teleport the player.

**Eraser mode**: Click any object to delete/hide it.

**Save**: Persists object positions + hidden IDs to localStorage.

---

## Door System

Doors are placed interactively via the **BottomNav → Portes** menu.

- **`DoorPlacer.tsx`** — raycasts against `buildingScenesRef` to find walls, shows ghost preview. X/C to rotate. Click to place. Saves `{ x, y, z, nx, nz, radius }` — `y` comes from terrain raycast hit point.
- **`DoorTriggers.tsx`** — renders placed doors as interactive 3D meshes, handles grab/move.
- **`DoorViewer.tsx`** — visual styles: x-ray (depthTest off), full, wireframe.
- **`DoorsSidebar.tsx`** — lists placed doors, rename/flip/delete, export to clipboard as TS config.
- **`indoorZones.ts`** — `DoorTrigger` type + `exportDoorsToClipboard()`.

Door state lives in `editorStore`: `placedDoors`, `selectedDoorId`, `placeDoorMode`, `viewDoorsMode`, `doorViewStyle`.

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

- **Avoid `gltf-transform join` on environment.glb / Globalmisc.glb / Setdress.glb** — destroys name-based material assignment
- **Always resize textures to 2048 before draco** — 4096×4096 causes GPU OOM blob: errors at runtime
- **Always BVH after instancing** — call `buildBVH(scene)` after `autoInstance(scene)` or any geometry is finalized
- **testMapScene is an array** — use `intersectObjects(testMapScene.current, true)` never `intersectObject`
- **Buildings from Blender are linked assets** — cannot Join in Blender, use `gltf-transform join` on the GLB directly
- **emissiveIntensity = 0 for buildings + misc** — UE-sourced materials often have non-zero emissive, causes bloom glow
- **Do NOT zero emissiveIntensity on env** — some env meshes use emissive as their primary color
- **DistanceCuller threshold ≥ 200 for env** — map is 55u radius, smaller values cause env to vanish at edges
- **Setdress starts hidden** — `visible=false` on load, DistanceCuller reveals at 15u
- **CameraRig must early-return** when `freeCamActive || viewDoorsMode` — both use EditorCamera's OrbitControls, CameraRig would fight them
- **freeCameraJumpTarget** in `playerRef.ts` — set to jump free cam without teleporting the player
- **KayKit GLTF models** use `.gltf` + `.bin` + shared texture. Extension handled by regex `/\.gl(b|tf)$/`
- **Kenney GLB models** have `metallicFactor=1` — must force `metalness=0`
- **Seasonal**: Auto-detects Halloween (Oct 1–Nov 5) / Christmas (Dec 1–Jan 5)

### Removed Systems

- **Collectibles** — `Collectibles.tsx` and `config/collectibles.ts` deleted. `gameStore` no longer has `collectedIds`, `score`, `lastCollected`, `collectItem`. HUD no longer shows gem counter.
