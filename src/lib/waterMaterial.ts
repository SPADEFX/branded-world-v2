import * as THREE from 'three'

export const waterUniforms = {
  uTime: { value: 0 },
}

function makeWaterMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: '#1a7a8a',
    emissive: '#0a3040',
    emissiveIntensity: 0.4,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `
        #include <common>
        uniform float uTime;
        varying vec3 vWPos;
        varying vec3 vWViewDir;
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 _wpos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        #else
          vec3 _wpos = (modelMatrix * vec4(position, 1.0)).xyz;
        #endif
        vWPos = _wpos;
        vWViewDir = normalize(cameraPosition - _wpos);
      `)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        uniform float uTime;
        varying vec3 vWPos;
        varying vec3 vWViewDir;

        float wH(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float wN(vec2 p) {
          vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(wH(i),wH(i+vec2(1,0)),f.x),mix(wH(i+vec2(0,1)),wH(i+vec2(1,1)),f.x),f.y);
        }
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        {
          vec2 xz = vWPos.xz;
          float r1 = wN(xz * 0.7 + vec2(uTime*0.3, uTime*0.2));
          float r2 = wN(xz * 1.4 - vec2(uTime*0.15, uTime*0.35));
          float ripple = r1*0.6 + r2*0.4;
          float foam = smoothstep(0.70, 0.88, ripple);
          float fresnel = pow(1.0 - clamp(dot(vWViewDir, vec3(0,1,0)), 0.0, 1.0), 2.5);
          vec3 deep    = vec3(0.04, 0.22, 0.32);
          vec3 shallow = vec3(0.12, 0.52, 0.62);
          vec3 foamCol = vec3(0.85, 0.95, 1.00);
          vec3 col = mix(deep, shallow, ripple*0.4 + fresnel*0.3);
          col = mix(col, foamCol, foam*0.45);
          vec3 sunDir = normalize(vec3(-0.3,1.2,-1.2));
          float spec = pow(max(dot(reflect(-sunDir, vec3(0,1,0)), vWViewDir), 0.0), 48.0) * 0.5;
          col += vec3(0.9,0.97,1.0) * spec;
          diffuseColor.rgb = col;
        }
      `)
  }

  mat.customProgramCacheKey = () => 'water-plane-material'
  return mat
}

export const waterMaterial = makeWaterMaterial()
