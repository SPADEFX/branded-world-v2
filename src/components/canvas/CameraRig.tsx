'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { useEditorStore } from '@/stores/editorStore'
import { playerPosition, cameraInput, npcPositions } from '@/lib/playerRef'
import { fadeScenesRef, buildingScenesRef, testMapScene } from '@/lib/testMapRef'

const CAM_DISTANCE_DEFAULT = 8
const CAM_DISTANCE_MIN = 3
const CAM_DISTANCE_MAX = 20
const CAM_HEIGHT = 4
const LOOK_HEIGHT = 1.9
const FOV_DEFAULT = 45
const FOV_INDOOR = 68
const CAM_DISTANCE_INDOOR = 3
const INDOOR_CEIL_CHECK = 5  // max ceiling height to consider "indoors"
const POSITION_DAMPING = 6
const CAM_TURN_SPEED = 1.5
const CAM_PITCH_DEFAULT = 0
const CAM_PITCH_MIN = -0.5  // regarder vers le haut
const CAM_PITCH_MAX = 0.8   // regarder vers le bas

const DIALOGUE_CAM_HEIGHT = 2.2
const DIALOGUE_CAM_SIDE = 2.5
const DIALOGUE_CAM_BACK = 3
const DIALOGUE_DAMPING = 3

export function CameraRig() {
  const { camera, gl } = useThree()
  const currentAngle = useRef(0)
  const camDistance = useRef(CAM_DISTANCE_DEFAULT)
  const camPitch = useRef(CAM_PITCH_DEFAULT)
  const isRightDragging = useRef(false)
  const lastMouseY = useRef(0)
  const tmpTarget = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())
  const smoothY = useRef(0)
  const camRaycaster = useRef(new THREE.Raycaster())
  const collRaycaster = useRef(new THREE.Raycaster())
  const camDir = useRef(new THREE.Vector3())
  const smoothCollDist = useRef(CAM_DISTANCE_DEFAULT)
  const indoorRaycaster = useRef(new THREE.Raycaster())
  const smoothFov = useRef(FOV_DEFAULT)
  const smoothIndoorDist = useRef(CAM_DISTANCE_DEFAULT)
  const _up = new THREE.Vector3(0, 1, 0)
  const _toCamera = new THREE.Vector3()
  const fadedMeshes = useRef<Map<THREE.Mesh, { origMaterial: THREE.MeshStandardMaterial; origOpacity: number; origTransparent: boolean }>>(new Map())

  // Scroll → zoom
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      camDistance.current = THREE.MathUtils.clamp(
        camDistance.current + e.deltaY * 0.01,
        CAM_DISTANCE_MIN,
        CAM_DISTANCE_MAX,
      )
    }
    // Clic droit → pitch vertical
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { isRightDragging.current = true; lastMouseY.current = e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isRightDragging.current) return
      const dy = e.clientY - lastMouseY.current
      lastMouseY.current = e.clientY
      camPitch.current = THREE.MathUtils.clamp(
        camPitch.current + dy * 0.005,
        CAM_PITCH_MIN,
        CAM_PITCH_MAX,
      )
    }
    const onMouseUp = (e: MouseEvent) => { if (e.button === 2) isRightDragging.current = false }

    const canvas = gl.domElement
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
    }
  }, [gl])

  useFrame((_, delta) => {
    // Skip when editor uses its own camera
    const { enabled: editorOn, cameraMode } = useEditorStore.getState()
    if (editorOn && cameraMode !== 'follow') return

    const dt = Math.min(delta, 0.05)
    const { x, y, z } = playerPosition
    smoothY.current = THREE.MathUtils.lerp(smoothY.current, y, 1 - Math.exp(-8 * dt))

    const activeDialogue = useGameStore.getState().activeDialogue

    if (activeDialogue) {
      const npcPos = npcPositions[activeDialogue.npcId]
      if (npcPos) {
        // Direction from player to NPC
        const dx = npcPos.x - x
        const dz = npcPos.z - z
        const dist = Math.sqrt(dx * dx + dz * dz) || 1
        const nx = dx / dist
        const nz = dz / dist

        // Perpendicular (right side)
        const px = -nz
        const pz = nx

        // Camera: midpoint between player & NPC, offset to the side and back
        const midX = (x + npcPos.x) / 2
        const midZ = (z + npcPos.z) / 2
        tmpTarget.current.set(
          midX + px * DIALOGUE_CAM_SIDE - nx * DIALOGUE_CAM_BACK,
          y + DIALOGUE_CAM_HEIGHT,
          midZ + pz * DIALOGUE_CAM_SIDE - nz * DIALOGUE_CAM_BACK,
        )

        // Look at the NPC
        tmpLook.current.set(npcPos.x, y + 1.2, npcPos.z)

        camera.position.lerp(tmpTarget.current, 1 - Math.exp(-DIALOGUE_DAMPING * dt))
        camera.lookAt(tmpLook.current)

        // Keep currentAngle in sync so return transition is smooth
        currentAngle.current = Math.atan2(
          x - camera.position.x,
          z - camera.position.z,
        )
      }
      return
    }

    // ── Normal orbit mode ──
    currentAngle.current -= cameraInput.x * CAM_TURN_SPEED * dt

    const angle = currentAngle.current
    const d = camDistance.current
    const pitch = camPitch.current
    const hDist = d * Math.cos(pitch)
    const vOffset = d * Math.sin(pitch)

    const camX = x - Math.sin(angle) * hDist
    const camZ = z - Math.cos(angle) * hDist

    const lookAt = new THREE.Vector3(x, smoothY.current + LOOK_HEIGHT, z)
    const idealCamPos = new THREE.Vector3(camX, smoothY.current + CAM_HEIGHT + vOffset, camZ)

    // ── Indoor detection: ray up from player, check for ceiling ──
    const isIndoors = (() => {
      const scenes = testMapScene.current
      if (!scenes.length) return false
      indoorRaycaster.current.set(lookAt, _up)
      indoorRaycaster.current.far = INDOOR_CEIL_CHECK
      const hits = indoorRaycaster.current.intersectObjects(scenes, true)
      return hits.length > 0
    })()

    const targetFov = isIndoors ? FOV_INDOOR : FOV_DEFAULT
    const targetIndoorDist = isIndoors ? CAM_DISTANCE_INDOOR : camDistance.current
    const transSpeed = 6
    smoothFov.current = THREE.MathUtils.lerp(smoothFov.current, targetFov, 1 - Math.exp(-transSpeed * dt))
    smoothIndoorDist.current = THREE.MathUtils.lerp(smoothIndoorDist.current, targetIndoorDist, 1 - Math.exp(-transSpeed * dt))

    const camFov = camera as THREE.PerspectiveCamera
    if (Math.abs(camFov.fov - smoothFov.current) > 0.05) {
      camFov.fov = smoothFov.current
      camFov.updateProjectionMatrix()
    }

    // ── Camera collision: smooth pull-in when geometry blocks the view ──
    _toCamera.subVectors(idealCamPos, lookAt)
    _toCamera.normalize()
    const userDist = smoothIndoorDist.current

    let maxDist = userDist
    idealCamPos.copy(lookAt).addScaledVector(_toCamera, userDist)
    const allScenes = testMapScene.current
    if (allScenes.length) {
      collRaycaster.current.set(lookAt, _toCamera)
      collRaycaster.current.far = userDist
      const hits = collRaycaster.current.intersectObjects(allScenes, true)
      if (hits.length > 0) maxDist = Math.max(0.5, hits[0].distance - 0.2)
    }

    // Fast pull-in, slow recovery
    const pullSpeed = maxDist < smoothCollDist.current ? 14 : 4
    smoothCollDist.current = THREE.MathUtils.lerp(smoothCollDist.current, maxDist, 1 - Math.exp(-pullSpeed * dt))
    idealCamPos.copy(lookAt).addScaledVector(_toCamera, smoothCollDist.current)

    // ── Obstruction fade: env always + buildings when indoors ──
    const scenes = isIndoors
      ? [...fadeScenesRef.current, ...buildingScenesRef.current]
      : fadeScenesRef.current
    const currentlyFaded = new Set<THREE.Mesh>()

    if (scenes.length) {
      camDir.current.subVectors(idealCamPos, lookAt).normalize()
      const dist = lookAt.distanceTo(idealCamPos)
      camRaycaster.current.set(lookAt, camDir.current)
      camRaycaster.current.far = dist
      const hits = camRaycaster.current.intersectObjects(scenes, true)

      for (const hit of hits) {
        const mesh = hit.object as THREE.Mesh
        if (!mesh.isMesh || Array.isArray(mesh.material)) continue
        currentlyFaded.add(mesh)

        if (!fadedMeshes.current.has(mesh)) {
          const origMat = mesh.material as THREE.MeshStandardMaterial
          const cloned = origMat.clone()
          cloned.transparent = true
          fadedMeshes.current.set(mesh, {
            origMaterial: origMat,
            origOpacity: origMat.opacity,
            origTransparent: origMat.transparent,
          })
          mesh.material = cloned
        }

        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.15, 1 - Math.exp(-10 * dt))
      }
    }

    // Restore meshes no longer blocking
    for (const [mesh, orig] of fadedMeshes.current) {
      if (currentlyFaded.has(mesh)) continue
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, orig.origOpacity, 1 - Math.exp(-8 * dt))
      if (Math.abs(mat.opacity - orig.origOpacity) < 0.01) {
        // Restore original material and dispose the clone
        mesh.material = orig.origMaterial
        mat.dispose()
        fadedMeshes.current.delete(mesh)
      }
    }


    tmpTarget.current.copy(idealCamPos)
    tmpLook.current.copy(lookAt)

    camera.position.lerp(tmpTarget.current, 1 - Math.exp(-POSITION_DAMPING * dt))
    camera.lookAt(tmpLook.current)
  })

  return null
}
