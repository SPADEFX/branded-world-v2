'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useEditorStore, editorRefs } from '@/stores/editorStore'
import { registerModelHitboxes, unregisterModelHitboxes } from '@/lib/hitboxes'
import { positionOverrides } from '@/config/editorPersistence'
import { SolanaMonument } from './SolanaMonument'
import {
  isInsideLand,
  distanceToShore,
  getBiome,
  seededRandom,
  resetSeed,
  BRIDGE_START,
  BRIDGE_END,
} from '@/lib/worldShape'

/* ── Preload ─────────────────────────────────────────────── */

const ALL_MODELS = [
  // Nature
  '/models/nature/tree_oak.glb',
  '/models/nature/tree_fat.glb',
  '/models/nature/tree_detailed.glb',
  '/models/nature/rock_largeA.glb',
  '/models/nature/rock_smallA.glb',
  '/models/nature/rock_tallA.glb',
  '/models/nature/plant_bush.glb',
  '/models/nature/plant_bushLarge.glb',
  '/models/nature/flower_purpleA.glb',
  '/models/nature/flower_yellowA.glb',
  '/models/nature/flower_redA.glb',
  '/models/nature/grass.glb',
  '/models/nature/grass_large.glb',
  '/models/nature/log.glb',
  '/models/nature/stump_round.glb',
  '/models/nature/campfire_stones.glb',
  // Pirate
  '/models/pirate/barrel.glb',
  '/models/pirate/boat-row-small.glb',
  '/models/pirate/boat-row-large.glb',
  '/models/pirate/crate.glb',
  '/models/pirate/crate-bottles.glb',
  '/models/pirate/chest.glb',
  '/models/pirate/flag-pirate.glb',
  '/models/pirate/flag.glb',
  '/models/pirate/structure-platform-dock.glb',
  '/models/pirate/structure-platform-dock-small.glb',
  '/models/pirate/platform-planks.glb',
  '/models/pirate/cannon.glb',
  '/models/pirate/ship-wreck.glb',
  '/models/pirate/structure.glb',
  '/models/pirate/structure-roof.glb',
  '/models/pirate/structure-fence.glb',
  '/models/pirate/rocks-sand-a.glb',
  '/models/pirate/rocks-sand-b.glb',
  '/models/pirate/rocks-sand-c.glb',
  '/models/pirate/palm-bend.glb',
  '/models/pirate/palm-straight.glb',
  '/models/pirate/palm-detailed-bend.glb',
  '/models/pirate/mast.glb',
  // Watercraft
  '/models/watercraft/boat-fishing-small.glb',
  '/models/watercraft/boat-sail-a.glb',
  '/models/watercraft/buoy.glb',
  '/models/watercraft/buoy-flag.glb',
  // Forest (for barriers)
  '/models/kaykit/forest/Tree_1_A_Color1.gltf',
  '/models/kaykit/forest/Tree_2_A_Color1.gltf',
  '/models/kaykit/forest/Tree_3_A_Color1.gltf',
  '/models/kaykit/forest/Tree_4_A_Color1.gltf',
  '/models/kaykit/forest/Tree_5_A_Color1.gltf',
  '/models/kaykit/forest/Bush_1_A_Color1.gltf',
  '/models/kaykit/forest/Bush_2_A_Color1.gltf',
  '/models/kaykit/forest/Rock_1_A_Color1.gltf',
  '/models/kaykit/forest/Rock_2_A_Color1.gltf',
  '/models/kaykit/forest/Rock_3_A_Color1.gltf',
  '/models/kaykit/forest/Hill_4x4x4_Color1.gltf',
  '/models/kaykit/forest/Hill_8x8x4_Color1.gltf',
]
ALL_MODELS.forEach((m) => useGLTF.preload(m))

/* ── Types & helpers ─────────────────────────────────────── */

type P = {
  model: string
  position: [number, number, number]
  rotation?: number
  scale?: number
}

/** Nature kit models — flat baseColorFactor colors in GLB (no texture).
 *  Kenney exports these with metallic=1 which looks black without an env map,
 *  so we clone the scene and force metalness=0 on every mesh material. */
function M({ model, position, rotation = 0, scale = 1 }: P) {
  const { scene } = useGLTF(model)
  const groupRef = useRef<THREE.Group>(null!)

  const id = useRef(
    `${model.split('/').pop()?.replace(/\.gl(b|tf)$/, '')}@${position[0]},${position[2]}`
  ).current
  const category = model.split('/')[2]
  const hidden = useEditorStore((s) => s.hiddenIds.has(id))

  // Use saved position override if available
  const override = positionOverrides[id]
  const pos = override?.position ?? position
  const rot = override?.rotation ?? rotation

  const fixed = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial
        if ('metalness' in mat) mat.metalness = 0
        mesh.material = mat
      }
    })
    return c
  }, [scene])

  const hitboxVersion = useEditorStore((s) => s.hitboxVersion)

  useEffect(() => {
    if (hidden) return
    // Use world position (accounts for parent group offsets)
    const wp = new THREE.Vector3()
    groupRef.current.getWorldPosition(wp)
    const wRot = rot + (groupRef.current.parent?.rotation.y ?? 0)
    useEditorStore.getState().register({ id, model, category, position: [wp.x, wp.y, wp.z], rotation: wRot, scale })
    editorRefs[id] = groupRef.current
    registerModelHitboxes(id, model, wp.x, wp.z, wRot, scale, scene)
    return () => {
      delete editorRefs[id]
      unregisterModelHitboxes(id, model)
    }
  }, [hitboxVersion, hidden])

  const handleClick = (e: any) => {
    if (!useEditorStore.getState().enabled) return
    e.stopPropagation()
    useEditorStore.getState().select(id)
  }

  if (hidden) return null

  return (
    <group ref={groupRef} position={pos} rotation={[0, rot, 0]} scale={scale} onClick={handleClick}>
      <primitive object={fixed} />
    </group>
  )
}

/** Pirate/Watercraft models — need manual colormap texture */
function Tex({
  model,
  position,
  rotation = 0,
  scale = 1,
  texture,
}: P & { texture: THREE.Texture }) {
  const { scene } = useGLTF(model)
  const groupRef = useRef<THREE.Group>(null!)

  const id = useRef(
    `${model.split('/').pop()?.replace(/\.gl(b|tf)$/, '')}@${position[0]},${position[2]}`
  ).current
  const category = model.split('/')[2]
  const hitboxVersion = useEditorStore((s) => s.hitboxVersion)
  const hidden = useEditorStore((s) => s.hiddenIds.has(id))

  // Use saved position override if available
  const override = positionOverrides[id]
  const pos = override?.position ?? position
  const rot = override?.rotation ?? rotation

  useEffect(() => {
    if (hidden) return
    // Use world position (accounts for parent group offsets)
    const wp = new THREE.Vector3()
    groupRef.current.getWorldPosition(wp)
    const wRot = rot + (groupRef.current.parent?.rotation.y ?? 0)
    useEditorStore.getState().register({ id, model, category, position: [wp.x, wp.y, wp.z], rotation: wRot, scale })
    editorRefs[id] = groupRef.current
    registerModelHitboxes(id, model, wp.x, wp.z, wRot, scale, scene)
    return () => {
      delete editorRefs[id]
      unregisterModelHitboxes(id, model)
    }
  }, [hitboxVersion, hidden])

  const handleClick = (e: any) => {
    if (!useEditorStore.getState().enabled) return
    e.stopPropagation()
    useEditorStore.getState().select(id)
  }

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.material = new THREE.MeshStandardMaterial({ map: texture })
      }
    })
    return c
  }, [scene, texture])

  if (hidden) return null

  return (
    <group ref={groupRef} position={pos} rotation={[0, rot, 0]} scale={scale} onClick={handleClick}>
      <primitive object={cloned} />
    </group>
  )
}

function Items({ items }: { items: P[] }) {
  return (
    <>
      {items.map((p, i) => (
        <M key={i} {...p} />
      ))}
    </>
  )
}

function TexItems({ items, texture }: { items: P[]; texture: THREE.Texture }) {
  return (
    <>
      {items.map((p, i) => (
        <Tex key={i} {...p} texture={texture} />
      ))}
    </>
  )
}

/* ── Shared textures ─────────────────────────────────────── */

function usePirateTexture() {
  return useMemo(() => {
    const tex = new THREE.TextureLoader().load('/models/pirate/Textures/colormap.png')
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function useWatercraftTexture() {
  return useMemo(() => {
    const tex = new THREE.TextureLoader().load('/models/watercraft/Textures/colormap.png')
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/* ── Main World ──────────────────────────────────────────── */

export function World() {
  return (
    <group>
      <Island />
      <Water />
      <CenterPlaza />
      <VillagePaths />
      <HarborArea />
      <WestVillage />
      <EastOutpost />
      <Trees />
      <CoastalRocks />
      <Vegetation />
      <OceanDecor />
      <ForestBarrier />
      <MountainBarrier />
      <Bridge />
    </group>
  )
}

/* ── Biome color palette ─────────────────────────────────── */

const BIOME_COLORS: Record<string, [number, number, number]> = {
  village: [0.53, 0.93, 0.67],    // #86efac — bright green
  forest: [0.30, 0.58, 0.32],     // dark green
  beach: [0.99, 0.90, 0.55],      // #fde68a — sand
  mountain: [0.66, 0.64, 0.62],   // #a8a29e — stone grey
}

/* ── Island — polygon-clipped PlaneGeometry with biome vertex colors ── */

function Island() {
  const handleClick = () => {
    if (!useEditorStore.getState().enabled) return
    useEditorStore.getState().select(null)
  }

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 200, 200)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      if (isInsideLand(x, z)) {
        const edgeDist = distanceToShore(x, z)
        // Smooth edge falloff near coast
        if (edgeDist < 3) {
          pos.setY(i, -0.6 * (1 - edgeDist / 3))
        } else {
          pos.setY(i, 0)
        }

        const biome = getBiome(x, z)
        const [r, g, b] = BIOME_COLORS[biome] ?? BIOME_COLORS.forest

        // Blend to sand near the very edge
        if (edgeDist < 4) {
          const t = edgeDist / 4
          const [sr, sg, sb] = BIOME_COLORS.beach
          colors[i * 3] = sr + (r - sr) * t
          colors[i * 3 + 1] = sg + (g - sg) * t
          colors[i * 3 + 2] = sb + (b - sb) * t
        } else {
          colors[i * 3] = r
          colors[i * 3 + 1] = g
          colors[i * 3 + 2] = b
        }
      } else {
        // Under water
        pos.setY(i, -5)
        colors[i * 3] = 0.3
        colors[i * 3 + 1] = 0.5
        colors[i * 3 + 2] = 0.3
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow onClick={handleClick}>
      <meshStandardMaterial vertexColors flatShading />
    </mesh>
  )
}

/* ── Water ───────────────────────────────────────────────── */

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aShoreDist;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vShoreDist;

  void main() {
    vec3 pos = position;
    vShoreDist = aShoreDist;

    // Dampen waves near shore (use per-vertex shore distance)
    float openWater = smoothstep(0.0, 8.0, -aShoreDist);

    // Gentle ocean swell
    float w1 = sin(pos.x * 0.4 + uTime * 0.5) * 0.10;
    float w2 = sin(pos.y * 0.6 + uTime * 0.7 + 2.0) * 0.06;
    float w3 = sin((pos.x * 0.3 + pos.y * 0.4) + uTime * 0.35) * 0.12;
    float w4 = sin(pos.x * 1.5 - pos.y * 0.8 + uTime * 1.0) * 0.03;
    pos.z += (w1 + w2 + w3 + w4) * openWater;

    // Compute analytical normal
    float dx = 0.4*cos(pos.x*0.4+uTime*0.5)*0.10
             + 0.3*cos((position.x*0.3+position.y*0.4)+uTime*0.35)*0.12
             + 1.5*cos(position.x*1.5-position.y*0.8+uTime*1.0)*0.03;
    float dy = 0.6*cos(pos.y*0.6+uTime*0.7+2.0)*0.06
             + 0.4*cos((position.x*0.3+position.y*0.4)+uTime*0.35)*0.12
             - 0.8*cos(position.x*1.5-position.y*0.8+uTime*1.0)*0.03;
    vNormal = normalize(vec3(-dx * openWater, -dy * openWater, 1.0));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vShoreDist;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453);
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormal);

    // shoreDist: positive = inside land, negative = in water
    // We negate so positive = distance into water from shore
    float waterDist = -vShoreDist;

    // ── Colors (tropical blue palette) ──
    vec3 shallowColor = vec3(0.35, 0.75, 0.90);
    vec3 midColor     = vec3(0.15, 0.50, 0.80);
    vec3 deepColor    = vec3(0.08, 0.30, 0.60);
    vec3 foamColor    = vec3(1.0, 1.0, 1.0);

    float depthFactor = smoothstep(0.0, 15.0, waterDist);
    vec3 baseColor = mix(shallowColor, midColor, smoothstep(0.0, 0.4, depthFactor));
    baseColor = mix(baseColor, deepColor, smoothstep(0.4, 1.0, depthFactor));

    // ── Fresnel ──
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    vec3 skyColor = vec3(0.55, 0.75, 0.95);
    baseColor = mix(baseColor, skyColor, fresnel * 0.3);

    // ── Shoreline foam waves ──
    // Wave 1: main wash
    float wash1 = sin(uTime * 0.8) * 0.5 + 0.5;
    float foamEdge1 = mix(-1.5, 1.0, wash1);
    float foam1 = smoothstep(foamEdge1 - 0.6, foamEdge1, waterDist)
                * (1.0 - smoothstep(foamEdge1, foamEdge1 + 0.3, waterDist));

    // Wave 2
    float wash2 = sin(uTime * 0.6 + 2.5) * 0.5 + 0.5;
    float foamEdge2 = mix(-1.0, 1.5, wash2);
    float foam2 = smoothstep(foamEdge2 - 0.4, foamEdge2, waterDist)
                * (1.0 - smoothstep(foamEdge2, foamEdge2 + 0.25, waterDist));

    // Wave 3
    float wash3 = sin(uTime * 1.2 + 4.0) * 0.5 + 0.5;
    float foamEdge3 = mix(-0.5, 0.8, wash3);
    float foam3 = smoothstep(foamEdge3 - 0.2, foamEdge3, waterDist)
                * (1.0 - smoothstep(foamEdge3, foamEdge3 + 0.15, waterDist));

    float shoreZone = (1.0 - smoothstep(-2.0, 3.0, waterDist));
    float totalFoam = max(max(foam1, foam2 * 0.7), foam3 * 0.5) * shoreZone;

    // Angular variation for natural foam shape
    float angle = atan(vWorldPos.z, vWorldPos.x);
    float angleNoise = sin(angle * 8.0 + uTime * 0.3) * 0.15 + sin(angle * 13.0 - uTime * 0.2) * 0.1;
    totalFoam *= (1.0 + angleNoise);
    totalFoam = clamp(totalFoam, 0.0, 1.0);

    baseColor = mix(baseColor, foamColor, totalFoam * 0.95);

    // ── Thin foam line at water edge ──
    float edgeFoam = (1.0 - smoothstep(-0.1, 0.4, waterDist)) * step(-0.5, waterDist);
    baseColor = mix(baseColor, foamColor, edgeFoam * 0.7);

    // ── Sun specular ──
    vec3 halfDir = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 150.0);
    baseColor += vec3(1.0, 0.98, 0.92) * spec * 0.6;

    // ── Sparkle dots ──
    vec2 sparkleCell = floor(vWorldPos.xz * 20.0);
    float sparkleRand = hash(sparkleCell);
    float sparkleSpeed = 0.1 + hash2(sparkleCell) * 0.3;
    float sparklePhase = hash(sparkleCell + vec2(42.0, 17.0)) * 6.283;
    float sparkleTime = fract(sparkleSpeed * uTime + sparklePhase);
    vec2 cellUV = fract(vWorldPos.xz * 20.0) - 0.5;
    float cellDist = length(cellUV);
    float roundMask = 1.0 - smoothstep(0.1, 0.25, cellDist);
    float sparkle = step(0.985, sparkleRand) * pow(1.0 - abs(sparkleTime - 0.5) * 2.0, 16.0) * roundMask;
    sparkle *= smoothstep(1.0, 4.0, waterDist);
    baseColor += vec3(1.0) * sparkle * 0.4;

    // ── Subtle caustics ──
    float c1 = sin(vWorldPos.x * 2.5 + uTime * 0.4) * sin(vWorldPos.z * 2.5 + uTime * 0.3);
    float c2 = sin(vWorldPos.x * 1.8 - uTime * 0.25) * sin(vWorldPos.z * 3.0 + uTime * 0.5);
    float caustic = (c1 + c2) * 0.5;
    float causticMask = smoothstep(0.0, 5.0, waterDist) * (1.0 - smoothstep(5.0, 20.0, waterDist));
    baseColor += vec3(0.08, 0.12, 0.15) * caustic * causticMask;

    // ── Alpha: transparent over land, fade in at shore ──
    float alpha = smoothstep(-1.5, 1.0, waterDist);
    alpha = max(alpha, totalFoam);
    alpha = max(alpha, edgeFoam * 0.8);
    alpha = mix(alpha, 0.92, smoothstep(2.0, 12.0, waterDist));
    alpha = mix(alpha, min(alpha + 0.15, 1.0), fresnel);

    gl_FragColor = vec4(baseColor, alpha);
  }
`

const _sunDir = new THREE.Vector3(15, 20, 10).normalize()

function Water() {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: _sunDir },
    }),
    [],
  )

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(300, 300, 128, 128)
    // Note: PlaneGeometry is in XY plane before rotation.
    // We compute shore dist using vertex XY coords (which become XZ after rotation).
    const pos = geo.attributes.position
    const shoreDist = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      // In PlaneGeometry (XY plane), X → world X, Y → world Z (after -90° X rotation)
      shoreDist[i] = distanceToShore(pos.getX(i), pos.getY(i))
    }
    geo.setAttribute('aShoreDist', new THREE.BufferAttribute(shoreDist, 1))
    return geo
  }, [])

  useFrame((state) => {
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ── Center Plaza — watchtower + stone circle ────────────── */

function CenterPlaza() {
  const tex = usePirateTexture()
  return (
    <group>
      {/* Stone plaza */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4, 32]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.7, 4, 32]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      {/* Solana monument */}
      <SolanaMonument />
      {/* Flag next to monument */}
      <Tex model="/models/pirate/flag-pirate.glb" position={[1.8, 0, 1]} scale={1} texture={tex} />
      {/* Cannon guarding the monument */}
      <Tex model="/models/pirate/cannon.glb" position={[-1.5, 0, 2]} rotation={Math.PI} scale={1} texture={tex} />
    </group>
  )
}

/* ── Dirt Paths ──────────────────────────────────────────── */

function PathSegment({ from, to, width = 2 }: { from: [number, number]; to: [number, number]; width?: number }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2

  return (
    <group position={[cx, 0, cz]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#c4a882" />
      </mesh>
    </group>
  )
}

function VillagePaths() {
  return (
    <group>
      {/* South: center → spawn */}
      <PathSegment from={[0, 5]} to={[0, 24]} width={2.5} />
      {/* East: center → product zone */}
      <PathSegment from={[3, 0]} to={[22, 5]} width={2} />
      {/* West: center → CTA zone */}
      <PathSegment from={[-3, 0]} to={[-22, 5]} width={2} />
      {/* NE: center → how-it-works */}
      <PathSegment from={[2, -3]} to={[14, -20]} width={2} />
      {/* NW: center → community */}
      <PathSegment from={[-2, -3]} to={[-14, -20]} width={2} />
      {/* SE: spawn → harbor */}
      <PathSegment from={[4, 20]} to={[24, 34]} width={2} />
      {/* To bridge */}
      <PathSegment from={[22, 5]} to={[42, 20]} width={2} />
      <PathSegment from={[42, 20]} to={[50, 28]} width={2} />
    </group>
  )
}

/* ── Harbor Area (south-east) — docks + boats + supplies ── */

function HarborArea() {
  const pirateTex = usePirateTexture()
  const waterTex = useWatercraftTexture()

  return (
    <group>
      {/* ─ Main dock extending into the sea (SE beach) ─ */}
      <group position={[30, 0, 40]} rotation={[0, 0.68, 0]}>
        <Tex model="/models/pirate/structure-platform-dock.glb" position={[0, 0, 0]} scale={1} texture={pirateTex} />
        <Tex model="/models/pirate/structure-platform-dock.glb" position={[0, 0, 1]} scale={1} texture={pirateTex} />
        <Tex model="/models/pirate/structure-platform-dock-small.glb" position={[0, 0, 2]} scale={1} texture={pirateTex} />
      </group>

      {/* Boats at the dock */}
      <Tex model="/models/pirate/boat-row-small.glb" position={[34, -0.4, 43]} rotation={0.7} scale={1} texture={pirateTex} />
      <Tex model="/models/watercraft/boat-fishing-small.glb" position={[32, -0.5, 44]} rotation={1.0} scale={1} texture={waterTex} />

      {/* Supply area next to dock */}
      <Tex model="/models/pirate/barrel.glb" position={[27, 0, 38]} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/barrel.glb" position={[27.5, 0, 38.6]} rotation={0.4} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/barrel.glb" position={[26.8, 0, 39.2]} rotation={1.1} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/crate.glb" position={[26, 0, 38.5]} rotation={0.3} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/crate-bottles.glb" position={[26.3, 0, 39.3]} rotation={0.8} scale={1} texture={pirateTex} />

      {/* Mast + pirate flag */}
      <Tex model="/models/pirate/mast.glb" position={[28, 0, 38]} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/flag-pirate.glb" position={[28.5, 0, 39.5]} scale={1} texture={pirateTex} />

      {/* Beached rowboat near spawn area */}
      <Tex model="/models/pirate/boat-row-small.glb" position={[-6, -0.1, 38]} rotation={-0.3} scale={1} texture={pirateTex} />

      {/* Second dock on east coast */}
      <group position={[42, 0, 10]} rotation={[0, 1.47, 0]}>
        <Tex model="/models/pirate/structure-platform-dock.glb" position={[0, 0, 0]} scale={1} texture={pirateTex} />
        <Tex model="/models/pirate/platform-planks.glb" position={[0, 0, 1]} scale={1} texture={pirateTex} />
      </group>

      {/* Boat at east dock */}
      <Tex model="/models/pirate/boat-row-large.glb" position={[46, -0.4, 8]} rotation={1.5} scale={1} texture={pirateTex} />

      {/* East dock supplies */}
      <Tex model="/models/pirate/barrel.glb" position={[40, 0, 8]} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/barrel.glb" position={[40.5, 0, 7.2]} rotation={0.9} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/crate.glb" position={[39, 0, 6.5]} rotation={1.1} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/cannon.glb" position={[42.5, 0, 12]} rotation={1.5} scale={1} texture={pirateTex} />

      {/* Ship wreck + buoys offshore */}
      <Tex model="/models/pirate/ship-wreck.glb" position={[50, -0.7, 44]} rotation={0.4} scale={1.3} texture={pirateTex} />
      <Tex model="/models/watercraft/buoy.glb" position={[48, -0.6, 20]} scale={1} texture={waterTex} />
      <Tex model="/models/watercraft/buoy.glb" position={[-50, -0.6, -12]} scale={1} texture={waterTex} />
      <Tex model="/models/watercraft/buoy-flag.glb" position={[56, -0.6, -5]} scale={1} texture={waterTex} />
    </group>
  )
}

/* ── West Village — structures + campfire + west dock ───── */

function WestVillage() {
  const tex = usePirateTexture()
  const waterTex = useWatercraftTexture()

  return (
    <group>
      {/* Hut near CTA zone */}
      <Tex model="/models/pirate/structure.glb" position={[-24, 0, 8]} rotation={0.8} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-roof.glb" position={[-24, 0, 8]} rotation={0.8} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[-26, 0, 6]} rotation={0.8} scale={1} texture={tex} />

      {/* Hut near community zone */}
      <Tex model="/models/pirate/structure.glb" position={[-16, 0, -20]} rotation={0.5} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-roof.glb" position={[-16, 0, -20]} rotation={0.5} scale={1} texture={tex} />

      {/* Campfire area — community hangout */}
      <M model="/models/nature/campfire_stones.glb" position={[-8, 0, -16]} scale={2.4} />
      <M model="/models/nature/log.glb" position={[-7, 0, -15]} rotation={0.8} scale={2.4} />
      <M model="/models/nature/log.glb" position={[-9, 0, -15]} rotation={-0.3} scale={2.4} />
      <Tex model="/models/pirate/barrel.glb" position={[-10, 0, -17]} rotation={0.3} scale={1} texture={tex} />
      <Tex model="/models/pirate/crate-bottles.glb" position={[-7, 0, -18]} rotation={1.7} scale={1} texture={tex} />

      {/* Fences along community area */}
      <Tex model="/models/pirate/structure-fence.glb" position={[-6, 0, -22]} rotation={0} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[-10, 0, -22]} rotation={0} scale={1} texture={tex} />

      {/* West dock */}
      <group position={[-38, 0, 14]} rotation={[0, -1.18, 0]}>
        <Tex model="/models/pirate/structure-platform-dock.glb" position={[0, 0, 0]} scale={1} texture={tex} />
        <Tex model="/models/pirate/structure-platform-dock-small.glb" position={[0, 0, 1]} scale={1} texture={tex} />
      </group>

      {/* Fishing boat at west dock */}
      <Tex model="/models/watercraft/boat-fishing-small.glb" position={[-42, -0.4, 16]} rotation={-1.2} scale={1} texture={waterTex} />

      {/* Supplies near west dock */}
      <Tex model="/models/pirate/barrel.glb" position={[-36, 0, 13]} scale={1} texture={tex} />
      <Tex model="/models/pirate/crate.glb" position={[-35, 0, 14.5]} rotation={0.6} scale={1} texture={tex} />
      <Tex model="/models/pirate/flag.glb" position={[-37, 0, 15]} scale={1} texture={tex} />

      {/* Props near west structures */}
      <Tex model="/models/pirate/barrel.glb" position={[-25, 0, 10]} rotation={1.9} scale={1} texture={tex} />
      <Tex model="/models/pirate/flag-pirate.glb" position={[-25, 0, 6]} rotation={0.8} scale={1} texture={tex} />
      <Tex model="/models/pirate/chest.glb" position={[-12, 0, -19]} rotation={0.5} scale={1} texture={tex} />
    </group>
  )
}

/* ── East Outpost — structures + lookout ─────────────────── */

function EastOutpost() {
  const tex = usePirateTexture()

  return (
    <group>
      {/* Hut near product zone */}
      <Tex model="/models/pirate/structure.glb" position={[24, 0, 10]} rotation={-0.8} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-roof.glb" position={[24, 0, 10]} rotation={-0.8} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[26, 0, 8]} rotation={-0.8} scale={1} texture={tex} />

      {/* Hut near how-it-works zone */}
      <Tex model="/models/pirate/structure.glb" position={[16, 0, -20]} rotation={-0.5} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-roof.glb" position={[16, 0, -20]} rotation={-0.5} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[14, 0, -22]} rotation={0} scale={1} texture={tex} />

      {/* Hut near spawn path */}
      <Tex model="/models/pirate/structure.glb" position={[10, 0, 26]} rotation={Math.PI} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-roof.glb" position={[10, 0, 26]} rotation={Math.PI} scale={1} texture={tex} />

      {/* Props around east structures */}
      <Tex model="/models/pirate/barrel.glb" position={[25, 0, 12]} rotation={0.7} scale={1} texture={tex} />
      <Tex model="/models/pirate/crate.glb" position={[26, 0, 7]} rotation={0.9} scale={1} texture={tex} />
      <Tex model="/models/pirate/flag-pirate.glb" position={[25, 0, 9]} rotation={-0.8} scale={1} texture={tex} />

      {/* Lookout cannon */}
      <Tex model="/models/pirate/cannon.glb" position={[-30, 0, -20]} rotation={-0.8} scale={1} texture={tex} />

      {/* Hidden chest */}
      <Tex model="/models/pirate/chest.glb" position={[28, 0, -22]} rotation={2.1} scale={1} texture={tex} />

      {/* Flag near spawn hut */}
      <Tex model="/models/pirate/flag.glb" position={[12, 0, 28]} rotation={Math.PI} scale={1} texture={tex} />

      {/* Props along south path */}
      <Tex model="/models/pirate/barrel.glb" position={[3, 0, 12]} rotation={2.5} scale={1} texture={tex} />
      <Tex model="/models/pirate/barrel.glb" position={[-3, 0, 18]} scale={1} texture={tex} />
    </group>
  )
}

/* ── Trees ───────────────────────────────────────────────── */

function Trees() {
  const tex = usePirateTexture()

  const palms: P[] = [
    // Beach/harbor area palms (south)
    { model: '/models/pirate/palm-bend.glb', position: [20, 0, 38], rotation: 0.9, scale: 1 },
    { model: '/models/pirate/palm-bend.glb', position: [10, 0, 36], rotation: 4.5, scale: 1 },
    { model: '/models/pirate/palm-bend.glb', position: [-8, 0, 36], rotation: 1.1, scale: 1.1 },
    { model: '/models/pirate/palm-straight.glb', position: [36, 0, 32], rotation: 1.7, scale: 0.9 },
    { model: '/models/pirate/palm-detailed-bend.glb', position: [24, 0, 36], rotation: 0.5, scale: 1 },
    // East coast palms
    { model: '/models/pirate/palm-bend.glb', position: [40, 0, 15], rotation: 2.4, scale: 1 },
    { model: '/models/pirate/palm-straight.glb', position: [38, 0, 0], rotation: 3.2, scale: 1 },
    { model: '/models/pirate/palm-detailed-bend.glb', position: [42, 0, 22], rotation: 2.8, scale: 1.1 },
    // West coast palms
    { model: '/models/pirate/palm-bend.glb', position: [-36, 0, 18], rotation: 2.4, scale: 1 },
    { model: '/models/pirate/palm-straight.glb', position: [-38, 0, -4], rotation: 5.1, scale: 1.1 },
    { model: '/models/pirate/palm-detailed-bend.glb', position: [-34, 0, 26], rotation: 4.0, scale: 1 },
  ]

  const inlandTrees: P[] = [
    // Village area scattered trees
    { model: '/models/nature/tree_oak.glb', position: [-14, 0, -4], rotation: 2.1, scale: 2.7 },
    { model: '/models/nature/tree_oak.glb', position: [16, 0, 14], rotation: 4.2, scale: 3.0 },
    { model: '/models/nature/tree_oak.glb', position: [-8, 0, -26], rotation: 1.5, scale: 3.3 },
    { model: '/models/nature/tree_fat.glb', position: [-16, 0, -4], rotation: 0.8, scale: 2.7 },
    { model: '/models/nature/tree_fat.glb', position: [12, 0, 24], rotation: 3.5, scale: 3.0 },
    { model: '/models/nature/tree_detailed.glb', position: [6, 0, -26], rotation: 1.2, scale: 3.0 },
    { model: '/models/nature/tree_detailed.glb', position: [18, 0, -24], rotation: 2.8, scale: 2.85 },
    { model: '/models/nature/tree_detailed.glb', position: [-6, 0, 28], rotation: 0.3, scale: 3.0 },
    // Extra trees for the bigger map
    { model: '/models/nature/tree_oak.glb', position: [30, 0, -10], rotation: 1.1, scale: 3.0 },
    { model: '/models/nature/tree_fat.glb', position: [-28, 0, 12], rotation: 2.3, scale: 2.7 },
    { model: '/models/nature/tree_detailed.glb', position: [20, 0, -16], rotation: 0.7, scale: 3.0 },
    { model: '/models/nature/tree_oak.glb', position: [-20, 0, 20], rotation: 3.8, scale: 2.7 },
    { model: '/models/nature/tree_fat.glb', position: [34, 0, 14], rotation: 1.5, scale: 3.0 },
    { model: '/models/nature/tree_detailed.glb', position: [-32, 0, -10], rotation: 4.5, scale: 2.85 },
  ]

  return (
    <group>
      <TexItems items={palms} texture={tex} />
      <Items items={inlandTrees} />
    </group>
  )
}

/* ── Rocks ───────────────────────────────────────────────── */

function CoastalRocks() {
  const tex = usePirateTexture()

  const sandyRocks: P[] = [
    { model: '/models/pirate/rocks-sand-a.glb', position: [40, 0, 6], rotation: 0.5, scale: 1 },
    { model: '/models/pirate/rocks-sand-a.glb', position: [-38, 0, -8], rotation: 3.1, scale: 1 },
    { model: '/models/pirate/rocks-sand-b.glb', position: [34, 0, -26], rotation: 1.8, scale: 1 },
    { model: '/models/pirate/rocks-sand-b.glb', position: [-30, 0, 28], rotation: 4.2, scale: 1 },
    { model: '/models/pirate/rocks-sand-c.glb', position: [18, 0, 40], rotation: 2.4, scale: 1 },
    { model: '/models/pirate/rocks-sand-c.glb', position: [-22, 0, -34], rotation: 0.9, scale: 1 },
    // Extra for larger coastline
    { model: '/models/pirate/rocks-sand-a.glb', position: [44, 0, 20], rotation: 1.8, scale: 1 },
    { model: '/models/pirate/rocks-sand-b.glb', position: [-42, 0, 14], rotation: 2.5, scale: 1 },
  ]

  const natureRocks: P[] = [
    { model: '/models/nature/rock_largeA.glb', position: [-12, 0, 2], rotation: 0.5, scale: 2.4 },
    { model: '/models/nature/rock_largeA.glb', position: [18, 0, -18], rotation: 2.3, scale: 1.8 },
    { model: '/models/nature/rock_smallA.glb', position: [6, 0, -6], rotation: 1.1, scale: 3.0 },
    { model: '/models/nature/rock_smallA.glb', position: [-6, 0, 16], rotation: 3.0, scale: 3 },
    { model: '/models/nature/rock_smallA.glb', position: [24, 0, 12], rotation: 0.7, scale: 2.7 },
    { model: '/models/nature/rock_tallA.glb', position: [26, 0, -26], rotation: 1.8, scale: 2.1 },
    { model: '/models/nature/rock_tallA.glb', position: [-20, 0, -26], rotation: 4.5, scale: 1.8 },
    // Extra for larger map
    { model: '/models/nature/rock_largeA.glb', position: [32, 0, 4], rotation: 1.2, scale: 2.4 },
    { model: '/models/nature/rock_smallA.glb', position: [-28, 0, -4], rotation: 2.1, scale: 3.0 },
    { model: '/models/nature/rock_tallA.glb', position: [10, 0, -32], rotation: 0.4, scale: 2.1 },
  ]

  return (
    <group>
      <TexItems items={sandyRocks} texture={tex} />
      <Items items={natureRocks} />
    </group>
  )
}

/* ── Vegetation ──────────────────────────────────────────── */

const VEGETATION: P[] = [
  // Bushes — village area
  { model: '/models/nature/plant_bush.glb', position: [2, 0, 12], scale: 3 },
  { model: '/models/nature/plant_bush.glb', position: [16, 0, 8], scale: 2.7 },
  { model: '/models/nature/plant_bush.glb', position: [-12, 0, -10], scale: 3 },
  { model: '/models/nature/plant_bush.glb', position: [8, 0, -16], scale: 2.4 },
  { model: '/models/nature/plant_bush.glb', position: [-24, 0, 2], scale: 2.7 },
  { model: '/models/nature/plant_bush.glb', position: [14, 0, -28], scale: 3 },
  { model: '/models/nature/plant_bushLarge.glb', position: [-16, 0, 16], scale: 2.1 },
  { model: '/models/nature/plant_bushLarge.glb', position: [24, 0, -4], scale: 2.4 },
  { model: '/models/nature/plant_bushLarge.glb', position: [-28, 0, -12], scale: 2.1 },
  // Bushes — outer ring
  { model: '/models/nature/plant_bush.glb', position: [30, 0, 20], scale: 3 },
  { model: '/models/nature/plant_bush.glb', position: [-34, 0, 8], scale: 2.7 },
  { model: '/models/nature/plant_bushLarge.glb', position: [36, 0, -8], scale: 2.1 },
  { model: '/models/nature/plant_bushLarge.glb', position: [-10, 0, 34], scale: 2.4 },
  // Flowers — village area
  { model: '/models/nature/flower_purpleA.glb', position: [2, 0, 6], scale: 3 },
  { model: '/models/nature/flower_purpleA.glb', position: [-6, 0, -24], scale: 3 },
  { model: '/models/nature/flower_yellowA.glb', position: [12, 0, 10], scale: 3 },
  { model: '/models/nature/flower_yellowA.glb', position: [-14, 0, 6], scale: 3 },
  { model: '/models/nature/flower_redA.glb', position: [6, 0, -10], scale: 3 },
  { model: '/models/nature/flower_redA.glb', position: [-4, 0, 22], scale: 3 },
  { model: '/models/nature/flower_purpleA.glb', position: [16, 0, -12], scale: 3 },
  { model: '/models/nature/flower_yellowA.glb', position: [-22, 0, -8], scale: 3 },
  { model: '/models/nature/flower_redA.glb', position: [30, 0, 16], scale: 3 },
  // Flowers — outer
  { model: '/models/nature/flower_purpleA.glb', position: [36, 0, 4], scale: 3 },
  { model: '/models/nature/flower_yellowA.glb', position: [-32, 0, 16], scale: 3 },
  { model: '/models/nature/flower_redA.glb', position: [8, 0, 38], scale: 3 },
  // Grass — spread across the map
  { model: '/models/nature/grass.glb', position: [8, 0, 4], scale: 3 },
  { model: '/models/nature/grass.glb', position: [-4, 0, -6], scale: 3.3 },
  { model: '/models/nature/grass.glb', position: [16, 0, 16], scale: 2.7 },
  { model: '/models/nature/grass.glb', position: [-20, 0, 12], scale: 3 },
  { model: '/models/nature/grass.glb', position: [28, 0, -10], scale: 2.7 },
  { model: '/models/nature/grass.glb', position: [-14, 0, 24], scale: 3 },
  { model: '/models/nature/grass.glb', position: [6, 0, -20], scale: 3 },
  { model: '/models/nature/grass.glb', position: [-30, 0, -2], scale: 2.7 },
  { model: '/models/nature/grass.glb', position: [32, 0, 8], scale: 3 },
  { model: '/models/nature/grass_large.glb', position: [0, 0, -22], scale: 2.4 },
  { model: '/models/nature/grass_large.glb', position: [26, 0, 6], scale: 2.7 },
  { model: '/models/nature/grass_large.glb', position: [-10, 0, 28], scale: 3 },
  { model: '/models/nature/grass_large.glb', position: [14, 0, 28], scale: 2.7 },
  { model: '/models/nature/grass_large.glb', position: [-26, 0, 18], scale: 3 },
  { model: '/models/nature/grass_large.glb', position: [38, 0, -4], scale: 2.7 },
  // Stumps
  { model: '/models/nature/stump_round.glb', position: [-28, 0, -18], scale: 2.7 },
  { model: '/models/nature/stump_round.glb', position: [10, 0, 20], scale: 3 },
  { model: '/models/nature/stump_round.glb', position: [22, 0, -20], scale: 2.7 },
  // Secondary island vegetation
  { model: '/models/nature/tree_oak.glb', position: [68, 0, 28], rotation: 1.2, scale: 3 },
  { model: '/models/nature/tree_fat.glb', position: [74, 0, 32], rotation: 2.5, scale: 2.7 },
  { model: '/models/nature/tree_detailed.glb', position: [72, 0, 24], rotation: 0.8, scale: 3 },
  { model: '/models/nature/plant_bush.glb', position: [70, 0, 36], scale: 3 },
  { model: '/models/nature/plant_bushLarge.glb', position: [66, 0, 32], scale: 2.4 },
  { model: '/models/nature/flower_purpleA.glb', position: [76, 0, 28], scale: 3 },
  { model: '/models/nature/grass.glb', position: [70, 0, 30], scale: 3 },
]

function Vegetation() {
  return <Items items={VEGETATION} />
}

/* ── Ocean Decorations — boats, rocks, buoys around island ─ */

/** Wrapper that bobs floating objects up/down on the waves */
function Bobbing({ children, speed = 1, amplitude = 0.12, phase = 0 }: {
  children: React.ReactNode
  speed?: number
  amplitude?: number
  phase?: number
}) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.sin(t * speed + phase) * amplitude
    ref.current.rotation.z = Math.sin(t * speed * 0.7 + phase + 1.0) * 0.02
    ref.current.rotation.x = Math.sin(t * speed * 0.5 + phase + 2.0) * 0.015
  })
  return <group ref={ref}>{children}</group>
}

function OceanDecor() {
  const pirateTex = usePirateTexture()
  const waterTex = useWatercraftTexture()

  return (
    <group>
      {/* ── Sailboat anchored NW ── */}
      <Bobbing speed={0.6} amplitude={0.15} phase={0}>
        <Tex model="/models/watercraft/boat-sail-a.glb" position={[-60, -0.5, -30]} rotation={0.8} scale={1.2} texture={waterTex} />
      </Bobbing>

      {/* ── Fishing boat drifting SW ── */}
      <Bobbing speed={0.7} amplitude={0.1} phase={2.0}>
        <Tex model="/models/watercraft/boat-fishing-small.glb" position={[-55, -0.5, 40]} rotation={-0.5} scale={1} texture={waterTex} />
      </Bobbing>

      {/* ── Rowboat drifting far south ── */}
      <Bobbing speed={0.8} amplitude={0.12} phase={1.2}>
        <Tex model="/models/pirate/boat-row-small.glb" position={[10, -0.45, 60]} rotation={0.3} scale={1} texture={pirateTex} />
      </Bobbing>

      {/* ── Large rowboat NE ── */}
      <Bobbing speed={0.5} amplitude={0.14} phase={3.5}>
        <Tex model="/models/pirate/boat-row-large.glb" position={[60, -0.45, -35]} rotation={2.2} scale={1} texture={pirateTex} />
      </Bobbing>

      {/* ── Buoys — navigation markers ── */}
      <Bobbing speed={0.9} amplitude={0.08} phase={0.5}>
        <Tex model="/models/watercraft/buoy-flag.glb" position={[-55, -0.5, 10]} scale={1} texture={waterTex} />
      </Bobbing>
      <Bobbing speed={1.0} amplitude={0.08} phase={1.8}>
        <Tex model="/models/watercraft/buoy.glb" position={[20, -0.5, 55]} scale={1} texture={waterTex} />
      </Bobbing>
      <Bobbing speed={0.85} amplitude={0.08} phase={3.0}>
        <Tex model="/models/watercraft/buoy-flag.glb" position={[-30, -0.5, -58]} scale={1} texture={waterTex} />
      </Bobbing>
      <Bobbing speed={0.95} amplitude={0.08} phase={4.5}>
        <Tex model="/models/watercraft/buoy.glb" position={[55, -0.5, 24]} scale={1} texture={waterTex} />
      </Bobbing>

      {/* ── Rock clusters in water ── */}
      <Tex model="/models/pirate/rocks-sand-a.glb" position={[-16, -0.6, -58]} rotation={1.2} scale={1.2} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-c.glb" position={[-12, -0.7, -60]} rotation={2.8} scale={0.8} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-b.glb" position={[-58, -0.5, -10]} rotation={0.7} scale={1.1} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-a.glb" position={[-60, -0.6, -6]} rotation={3.5} scale={0.7} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-c.glb" position={[44, -0.5, 52]} rotation={1.9} scale={1} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-b.glb" position={[46, -0.6, 50]} rotation={4.1} scale={0.8} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-a.glb" position={[64, -0.5, -20]} rotation={2.3} scale={1.3} texture={pirateTex} />
      <Tex model="/models/pirate/rocks-sand-b.glb" position={[-36, -0.6, 56]} rotation={0.4} scale={1} texture={pirateTex} />
    </group>
  )
}

/* ── Forest Edge — sparse decorative trees near the coastline ── */

const FOREST_TREE_MODELS = [
  '/models/kaykit/forest/Tree_1_A_Color1.gltf',
  '/models/kaykit/forest/Tree_2_A_Color1.gltf',
  '/models/kaykit/forest/Tree_3_A_Color1.gltf',
  '/models/kaykit/forest/Tree_4_A_Color1.gltf',
  '/models/kaykit/forest/Tree_5_A_Color1.gltf',
]

const FOREST_BUSH_MODELS = [
  '/models/kaykit/forest/Bush_1_A_Color1.gltf',
  '/models/kaykit/forest/Bush_2_A_Color1.gltf',
]

function ForestBarrier() {
  const items = useMemo(() => {
    resetSeed(42)
    const result: P[] = []

    // Sparse trees only near the coastline (5-12 units from edge)
    // Much wider spacing — decorative only, boundary handled by isInsideLand()
    for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
      const r = 38 + seededRandom() * 10
      const x = Math.cos(angle) * r + (seededRandom() - 0.5) * 4
      const z = Math.sin(angle) * r + (seededRandom() - 0.5) * 4

      if (!isInsideLand(x, z)) continue
      const shore = distanceToShore(x, z)
      // Only place trees 5-15 units from the edge
      if (shore < 5 || shore > 15) continue
      const biome = getBiome(x, z)
      if (biome === 'beach' || biome === 'mountain' || biome === 'village') continue

      const isBush = seededRandom() < 0.3
      const model = isBush
        ? FOREST_BUSH_MODELS[Math.floor(seededRandom() * FOREST_BUSH_MODELS.length)]
        : FOREST_TREE_MODELS[Math.floor(seededRandom() * FOREST_TREE_MODELS.length)]

      result.push({
        model,
        position: [x, 0, z],
        rotation: seededRandom() * Math.PI * 2,
        scale: isBush ? 1.5 + seededRandom() * 0.8 : 1.2 + seededRandom() * 0.6,
      })
    }

    // A few trees on the secondary island
    for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
      const r = 3 + seededRandom() * 5
      const x = 70 + Math.cos(angle) * r
      const z = 30 + Math.sin(angle) * r
      if (!isInsideLand(x, z)) continue

      result.push({
        model: FOREST_TREE_MODELS[Math.floor(seededRandom() * FOREST_TREE_MODELS.length)],
        position: [x, 0, z],
        rotation: seededRandom() * Math.PI * 2,
        scale: 1.2 + seededRandom() * 0.6,
      })
    }

    return result
  }, [])

  return <Items items={items} />
}

/* ── Mountain Edge — scattered rocks near the north coast ── */

const MOUNTAIN_MODELS = [
  '/models/kaykit/forest/Rock_1_A_Color1.gltf',
  '/models/kaykit/forest/Rock_2_A_Color1.gltf',
  '/models/kaykit/forest/Rock_3_A_Color1.gltf',
  '/models/kaykit/forest/Hill_4x4x4_Color1.gltf',
  '/models/kaykit/forest/Hill_8x8x4_Color1.gltf',
]

function MountainBarrier() {
  const items = useMemo(() => {
    resetSeed(123)
    const result: P[] = []

    // Sparse rocks near the north coast — wider grid spacing
    for (let x = -38; x < 34; x += 10) {
      for (let z = -48; z < -24; z += 10) {
        const jx = x + (seededRandom() - 0.5) * 6
        const jz = z + (seededRandom() - 0.5) * 6
        if (!isInsideLand(jx, jz)) continue
        if (getBiome(jx, jz) !== 'mountain') continue

        const isHill = seededRandom() < 0.3
        const model = isHill
          ? MOUNTAIN_MODELS[3 + Math.floor(seededRandom() * 2)]
          : MOUNTAIN_MODELS[Math.floor(seededRandom() * 3)]

        result.push({
          model,
          position: [jx, 0, jz],
          rotation: seededRandom() * Math.PI * 2,
          scale: isHill ? 1.5 + seededRandom() * 1.0 : 1.8 + seededRandom() * 1.2,
        })
      }
    }

    return result
  }, [])

  return <Items items={items} />
}

/* ── Bridge — connects main island to secondary island ────── */

function Bridge() {
  const tex = usePirateTexture()

  const segments = useMemo(() => {
    const [sx, sz] = BRIDGE_START
    const [ex, ez] = BRIDGE_END
    const dx = ex - sx
    const dz = ez - sz
    const len = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dx, dz)
    const segCount = Math.ceil(len / 2)
    const result: { position: [number, number, number]; rotation: number }[] = []

    for (let i = 0; i < segCount; i++) {
      const t = (i + 0.5) / segCount
      result.push({
        position: [sx + dx * t, -0.05, sz + dz * t],
        rotation: angle,
      })
    }
    return result
  }, [])

  return (
    <group>
      {segments.map((seg, i) => (
        <Tex
          key={`bridge-${i}`}
          model="/models/pirate/platform-planks.glb"
          position={seg.position}
          rotation={seg.rotation}
          scale={1}
          texture={tex}
        />
      ))}
      {/* Fence posts on sides */}
      <Tex model="/models/pirate/structure-fence.glb" position={[51, 0, 26.5]} rotation={Math.PI / 2} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[55, 0, 26.5]} rotation={Math.PI / 2} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[51, 0, 29.5]} rotation={Math.PI / 2} scale={1} texture={tex} />
      <Tex model="/models/pirate/structure-fence.glb" position={[55, 0, 29.5]} rotation={Math.PI / 2} scale={1} texture={tex} />
    </group>
  )
}
