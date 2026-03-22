'use client'

import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { testMapScene } from '@/lib/testMapRef'

const CLIFF_PATTERNS = [
  'SM_Env_Rock_Cliff', 'SM_Env_Mountains', 'SM_Env_Rock_01',
  'SM_Env_Rock_02', 'SM_Env_Rock_03', 'SM_Env_Rock_Round',
  'SM_Env_Rock_Square', 'SM_Env_Rock_Bridge', 'SM_Env_Rock_Stairs',
]

const cliffUniforms = {
  uRockColor: { value: new THREE.Color('#8e9eae') },
  uRockDark:  { value: new THREE.Color('#58686e') },
  uMossColor: { value: new THREE.Color('#8a9658') },
  uMossDark:  { value: new THREE.Color('#6a7840') },
}

function makeCliffMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 })

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cliffUniforms)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vCliffWorldPos;
        varying vec3 vCliffWorldNormal;
      `)
      .replace('#include <project_vertex>', `
        #include <project_vertex>
        vCliffWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCliffWorldNormal = normalize(mat3(modelMatrix) * normal);
      `)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vCliffWorldPos;
        varying vec3 vCliffWorldNormal;
        uniform vec3 uRockColor;
        uniform vec3 uRockDark;
        uniform vec3 uMossColor;
        uniform vec3 uMossDark;

        float cliffHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float cliffNoise(vec2 p) {
          return cliffHash(floor(p)) * 0.50
               + cliffHash(floor(p * 2.7 + 1.3)) * 0.30
               + cliffHash(floor(p * 6.1 + 4.1)) * 0.20;
        }
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        {
          float slope = clamp(vCliffWorldNormal.y, 0.0, 1.0);
          float n1 = cliffNoise(vCliffWorldPos.xz * 0.30) * 0.28 - 0.04;
          float n2 = cliffNoise(vCliffWorldPos.xz * 1.20) * 0.14;
          float n3 = cliffNoise(vCliffWorldPos.xz * 3.50) * 0.08;
          float stratum = cliffHash(floor(vec2(vCliffWorldPos.y * 0.9 + vCliffWorldPos.x * 0.1, vCliffWorldPos.z * 0.5)));
          vec3 rockCol = mix(uRockDark, uRockColor, stratum * 0.80 + n2 + n3);
          float mossVar = cliffHash(floor(vCliffWorldPos.xz * 0.8));
          vec3 mossCol = mix(uMossDark, uMossColor, mossVar * 0.7 + n2);
          float mossFactor = smoothstep(0.72, 0.88, slope + n1);
          diffuseColor.rgb = mix(rockCol, mossCol, mossFactor);
        }
      `)
  }

  mat.customProgramCacheKey = () => 'cliff-slope-material'
  return mat
}

const cliffMaterial = makeCliffMaterial()

function isCliff(name: string) {
  return CLIFF_PATTERNS.some((p) => name.includes(p))
}

export function TestMap() {
  const { scene } = useGLTF('/models/untitled.glb')

  useEffect(() => {
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh

      mesh.receiveShadow = true
      // Seulement les gros éléments structurels castent des ombres
      const n = mesh.name
      mesh.castShadow = (
        n.includes('SM_Env_Rock_Cliff') ||
        n.includes('SM_Env_Mountains') ||
        n.includes('SM_Bld_') ||
        n.includes('SM_Env_Ground') ||
        n.includes('SM_Env_Terrain') ||
        n.includes('SM_Env_Rock_Bridge') ||
        n.includes('SM_Env_Rock_Stairs')
      )

      if (isCliff(mesh.name)) {
        mesh.material = cliffMaterial
        return
      }

      // Tous les autres : fix metalness
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m.isMeshStandardMaterial) continue
        m.metalness = 0
        m.roughness = 0.9
      }
    })

    testMapScene.current = scene
    return () => { testMapScene.current = null }
  }, [scene])

  return <primitive object={scene} position={[0, 0, 0]} />
}

useGLTF.preload('/models/untitled.glb')
