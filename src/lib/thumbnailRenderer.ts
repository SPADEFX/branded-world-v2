import * as THREE from 'three'

const SIZE = 80
const cache = new Map<string, string>()
let _renderer: THREE.WebGLRenderer | null = null

function getRenderer(): THREE.WebGLRenderer {
  if (!_renderer) {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    _renderer.setSize(SIZE, SIZE)
    _renderer.outputColorSpace = THREE.SRGBColorSpace
  }
  return _renderer
}

export async function generateThumbnails(
  modelPaths: string[],
  texturePath: string | undefined,
  onGenerated: (path: string, dataUrl: string) => void
): Promise<void> {
  const { GLTFLoader } = await import(
    'three/examples/jsm/loaders/GLTFLoader.js'
  )
  const loader = new GLTFLoader()
  const renderer = getRenderer()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(1.8, 1.2, 1.8)
  camera.lookAt(0, 0.2, 0)

  const dir = new THREE.DirectionalLight(0xffffff, 2.5)
  dir.position.set(2, 3, 2)
  scene.add(dir)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  let texture: THREE.Texture | null = null
  if (texturePath) {
    texture = await new THREE.TextureLoader().loadAsync(texturePath)
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace
  }

  for (const modelPath of modelPaths) {
    if (cache.has(modelPath)) {
      onGenerated(modelPath, cache.get(modelPath)!)
      continue
    }

    try {
      const gltf = await loader.loadAsync(modelPath)
      const model = gltf.scene.clone(true)

      if (texture) {
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            ;(child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
              map: texture,
            })
          }
        })
      }

      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const sz = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(sz.x, sz.y, sz.z) || 1
      model.position.sub(center)
      const s = 1.4 / maxDim
      model.scale.set(s, s, s)

      scene.add(model)
      renderer.render(scene, camera)
      const dataUrl = renderer.domElement.toDataURL()
      cache.set(modelPath, dataUrl)
      scene.remove(model)

      onGenerated(modelPath, dataUrl)

      // Yield to main thread between models
      await new Promise((r) => setTimeout(r, 0))
    } catch {
      // Skip failed models
    }
  }
}
