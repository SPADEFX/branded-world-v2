import * as THREE from 'three'

export const waterfallUniforms = {
  uTime: { value: 0 },
}

// ── Vertical waterfall stream (fx_waterfall) ───────────────────────────────
// Uses world-space Y for scroll direction — works regardless of UV orientation
function makeWaterfallStreamMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#0a8898',
    emissiveIntensity: 0.3,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterfallUniforms.uTime

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vWfWorldPos;
      `)
      .replace('#include <project_vertex>', `
        #include <project_vertex>
        vWfWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        uniform float uTime;
        varying vec3 vWfWorldPos;

        float wfHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float wfNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(wfHash(i),                    wfHash(i + vec2(1.0, 0.0)), f.x),
            mix(wfHash(i + vec2(0.0, 1.0)),   wfHash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        {
          // World-space scroll: Y decreases (water falls down)
          float scrollY = vWfWorldPos.y - uTime * 8.0;
          float waveX   = vWfWorldPos.x + sin(vWfWorldPos.y * 0.4 + uTime * 1.5) * 0.8;

          vec2 uv1 = vec2(waveX * 0.25, scrollY * 0.18);
          vec2 uv2 = vec2(waveX * 0.40 + 0.5, scrollY * 0.30);

          float streak1 = wfNoise(uv1);
          float streak2 = wfNoise(uv2);
          float flow = streak1 * 0.6 + streak2 * 0.4;
          float foam  = smoothstep(0.62, 0.85, flow);

          vec3 waterCol = vec3(0.10, 0.55, 0.68);
          vec3 foamCol  = vec3(0.75, 0.92, 0.95);
          diffuseColor.rgb = mix(waterCol, foamCol, foam);
          diffuseColor.a   = 0.88 + foam * 0.10;
        }
      `)
  }

  mat.customProgramCacheKey = () => 'waterfall-stream-material'
  return mat
}

// ── Horizontal splash pool (SM_Env_Water_Plane_Waterfall) ─────────────────
// Radial turbulence in world XZ plane
function makeWaterfallPoolMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: '#cceeff',
    emissive: '#88bbdd',
    emissiveIntensity: 0.25,
    roughness: 0.15,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterfallUniforms.uTime

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vWfWorldPos;
      `)
      .replace('#include <project_vertex>', `
        #include <project_vertex>
        vWfWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        uniform float uTime;
        varying vec3 vWfWorldPos;

        float wfHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float wfNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(wfHash(i),                    wfHash(i + vec2(1.0, 0.0)), f.x),
            mix(wfHash(i + vec2(0.0, 1.0)),   wfHash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        {
          // Radial ripples outward from center in XZ plane
          vec2 xz = vWfWorldPos.xz * 0.3;
          float ripple = sin(length(xz) * 5.0 - uTime * 4.0) * 0.5 + 0.5;
          vec2 uv1 = xz + vec2(uTime * 0.3, uTime * 0.2);
          vec2 uv2 = xz * 1.7 - vec2(uTime * 0.2, uTime * 0.35);
          float n1 = wfNoise(uv1);
          float n2 = wfNoise(uv2);
          float foam = smoothstep(0.55, 0.80, n1 * 0.5 + n2 * 0.3 + ripple * 0.2);

          vec3 waterCol = vec3(0.10, 0.55, 0.68);
          vec3 foamCol  = vec3(0.75, 0.92, 0.95);
          diffuseColor.rgb = mix(waterCol, foamCol, foam);
          diffuseColor.a   = 0.75 + foam * 0.2;
        }
      `)
  }

  mat.customProgramCacheKey = () => 'waterfall-pool-material'
  return mat
}

export const waterfallStreamMaterial = makeWaterfallStreamMaterial()
export const waterfallPoolMaterial   = makeWaterfallPoolMaterial()
