'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useInput } from '@/hooks/useInput'
import { useGameStore } from '@/stores/gameStore'
import { playerPosition, playerRotation, cameraInput, npcPositions, teleportTarget } from '@/lib/playerRef'
import { testMapScene } from '@/lib/testMapRef'
import { resolveCollisions } from '@/lib/hitboxes'

const MOVE_SPEED = 4
const ACCELERATION = 10
const DECELERATION = 8
const ROTATION_SPEED = 12
const JUMP_FORCE = 6
const GRAVITY = 14
const PLAYER_RADIUS = 0.3
const STEP_HEIGHT = 0.35   // max step the player can climb
const WALL_CHECK_DIST = PLAYER_RADIUS + 0.05
const DIALOGUE_STAND_DIST = 1.8
const DIALOGUE_MOVE_SPEED = 4

const _camDir = new THREE.Vector3()
const _downRaycaster = new THREE.Raycaster()
const _wallRaycaster = new THREE.Raycaster()
const _downDir = new THREE.Vector3(0, -1, 0)
const _rayOrigin = new THREE.Vector3()
const _wallDirs = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
]

function getGroundHeight(px: number, py: number, pz: number): number {
  const scenes = testMapScene.current
  if (!scenes.length) return py
  _rayOrigin.set(px, py + 10, pz)
  _downRaycaster.set(_rayOrigin, _downDir)
  const hits = _downRaycaster.intersectObjects(scenes, true)
  for (const hit of hits) {
    if (hit.point.y <= py + STEP_HEIGHT) return hit.point.y
  }
  return -Infinity
}

/** Returns how much to push the player back per axis to avoid walls. */
function resolveWalls(px: number, py: number, pz: number): { dx: number; dz: number } {
  const scenes = testMapScene.current
  if (!scenes.length) return { dx: 0, dz: 0 }

  let dx = 0
  let dz = 0
  // Cast from above step height to avoid treating stair risers as walls
  _rayOrigin.set(px, py + STEP_HEIGHT + 0.3, pz)

  for (const dir of _wallDirs) {
    _wallRaycaster.set(_rayOrigin, dir)
    _wallRaycaster.far = WALL_CHECK_DIST
    const hits = _wallRaycaster.intersectObjects(scenes, true)
    if (hits.length > 0) {
      const pen = WALL_CHECK_DIST - hits[0].distance
      dx -= dir.x * pen
      dz -= dir.z * pen
    }
  }
  return { dx, dz }
}

export function Player() {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null!)
  const velocityRef = useRef(new THREE.Vector2(0, 0))
  const currentRotation = useRef(0)
  const prevInteract = useRef(false)
  const prevJump = useRef(false)
  const isMovingRef = useRef(false)
  const isJumpingRef = useRef(false)
  const verticalVelocity = useRef(0)
  const smoothGroundH = useRef<number | null>(null)
  const keys = useInput()

  const { scene: model } = useGLTF('/models/character/Knight.glb')
  const { animations: moveAnims } = useGLTF('/models/character/anims/MovementBasic.glb')
  const { animations: generalAnims } = useGLTF('/models/character/anims/General.glb')

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [model])

  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({})

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model)
    mixerRef.current = mixer
    actionsRef.current = {}

    const findClip = (anims: THREE.AnimationClip[], name: string) =>
      anims.find((c) => c.name === name)

    const idleClip = findClip(generalAnims, 'Idle_A')
    const runClip = findClip(moveAnims, 'Running_A')
    const jumpClip = findClip(moveAnims, 'Jump_Full_Short')

    if (idleClip) {
      const action = mixer.clipAction(idleClip)
      actionsRef.current['idle'] = action
      action.play()
    }
    if (runClip) actionsRef.current['run'] = mixer.clipAction(runClip)
    if (jumpClip) {
      const action = mixer.clipAction(jumpClip)
      action.loop = THREE.LoopOnce
      action.clampWhenFinished = true
      actionsRef.current['jump'] = action
    }

    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model) }
  }, [model, moveAnims, generalAnims])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)
    mixerRef.current?.update(dt)

    // Teleport from editor
    if (teleportTarget.current) {
      const t = teleportTarget.current
      teleportTarget.current = null
      groupRef.current.position.set(t.x, t.y, t.z)
      velocityRef.current.set(0, 0)
      verticalVelocity.current = 0
      smoothGroundH.current = t.y
      playerPosition.x = t.x; playerPosition.y = t.y; playerPosition.z = t.z
    }

    const state = useGameStore.getState()
    const { joystickInput, activeModal, activeDialogue, nearbyZone, nearbyNPC, showOnboarding } = state

    const interact = keys.current.interact
    if (interact && !prevInteract.current) {
      if (activeDialogue) state.advanceDialogue()
      else if (activeModal) state.closeModal()
      else if (nearbyNPC && !showOnboarding) state.openDialogue(nearbyNPC)
      else if (nearbyZone && !showOnboarding) state.openModal(nearbyZone)
    }
    prevInteract.current = interact
    if (activeModal || showOnboarding) return

    // ── Dialogue positioning ──
    if (activeDialogue) {
      const npcPos = npcPositions[activeDialogue.npcId]
      if (npcPos) {
        const pos = groupRef.current.position
        const dx = npcPos.x - pos.x
        const dz = npcPos.z - pos.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        const gap = Math.abs(dist - DIALOGUE_STAND_DIST)
        if (gap > 0.1) {
          const nx = dx / dist
          const nz = dz / dist
          const sign = dist > DIALOGUE_STAND_DIST ? 1 : -1
          const step = Math.min(DIALOGUE_MOVE_SPEED * dt, gap)
          pos.x += nx * sign * step
          pos.z += nz * sign * step
          if (!isMovingRef.current) {
            const acts = actionsRef.current
            if (acts['idle'] && acts['run']) { acts['idle'].crossFadeTo(acts['run'], 0.2, true); acts['run'].enabled = true; acts['run'].play() }
            isMovingRef.current = true
          }
        } else {
          if (isMovingRef.current) {
            const acts = actionsRef.current
            if (acts['run'] && acts['idle']) { acts['run'].crossFadeTo(acts['idle'], 0.2, true); acts['idle'].enabled = true; acts['idle'].play() }
            isMovingRef.current = false
          }
        }
        const targetRot = Math.atan2(dx, dz)
        currentRotation.current = lerpAngle(currentRotation.current, targetRot, 8 * dt)
        groupRef.current.rotation.y = currentRotation.current
        playerPosition.x = pos.x; playerPosition.y = pos.y; playerPosition.z = pos.z
        playerRotation.y = currentRotation.current; cameraInput.x = 0
      }
      return
    }

    // ── Input ──
    let ix = 0, iz = 0
    if (keys.current.forward) iz -= 1
    if (keys.current.backward) iz += 1
    if (keys.current.left) ix -= 1
    if (keys.current.right) ix += 1
    if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) { ix = joystickInput.x; iz = joystickInput.y }
    const len = Math.sqrt(ix * ix + iz * iz)
    if (len > 1) { ix /= len; iz /= len }

    camera.getWorldDirection(_camDir)
    _camDir.y = 0; _camDir.normalize()
    const rx = -_camDir.z; const rz = _camDir.x
    const wx = ix * rx + (-iz) * _camDir.x
    const wz = ix * rz + (-iz) * _camDir.z

    const vel = velocityRef.current
    const isMoving = len > 0.1
    if (isMoving) {
      vel.x = THREE.MathUtils.lerp(vel.x, wx * MOVE_SPEED, ACCELERATION * dt)
      vel.y = THREE.MathUtils.lerp(vel.y, wz * MOVE_SPEED, ACCELERATION * dt)
      currentRotation.current = lerpAngle(currentRotation.current, Math.atan2(wx, wz), ROTATION_SPEED * dt)
    } else {
      vel.x = THREE.MathUtils.lerp(vel.x, 0, DECELERATION * dt)
      vel.y = THREE.MathUtils.lerp(vel.y, 0, DECELERATION * dt)
    }

    const pos = groupRef.current.position
    const groundH = getGroundHeight(pos.x, pos.y, pos.z)
    const onGround = groundH > -Infinity && pos.y <= groundH + 0.05

    // ── Snap to ground / gravity ──
    if (onGround && verticalVelocity.current <= 0) {
      // Low-pass filter ground height: damps tiny pavé bumps, tracks stairs.
      // Going up: lerp at 12 (fast enough for stairs, damps sub-5cm variations).
      // Going down: snap instantly.
      if (smoothGroundH.current === null) smoothGroundH.current = groundH
      const gap = groundH - smoothGroundH.current
      if (gap > 0.05) {
        // Real stair riser (≥5 cm) — track fast so player doesn't sink
        smoothGroundH.current = THREE.MathUtils.lerp(smoothGroundH.current, groundH, Math.min(20 * dt, 1))
      } else if (gap > -0.05) {
        // Small variation ±5 cm (pavé, gentle slope) — slow lerp damps bobbing
        smoothGroundH.current = THREE.MathUtils.lerp(smoothGroundH.current, groundH, Math.min(5 * dt, 1))
      } else {
        // Large drop (ledge edge) — snap immediately
        smoothGroundH.current = groundH
      }
      pos.y = smoothGroundH.current
      verticalVelocity.current = 0
      if (isJumpingRef.current) {
        isJumpingRef.current = false
        const acts = actionsRef.current
        if (acts['jump']) acts['jump'].fadeOut(0.15)
        if (isMoving && acts['run']) acts['run'].reset().fadeIn(0.15).play()
        else if (acts['idle']) acts['idle'].reset().fadeIn(0.15).play()
      }
    }

    // ── Jump ──
    const jumpPressed = keys.current.jump
    if (jumpPressed && !prevJump.current && onGround && !isJumpingRef.current) {
      verticalVelocity.current = JUMP_FORCE
      isJumpingRef.current = true
      const acts = actionsRef.current
      if (acts['jump']) {
        if (isMoving && acts['run']) acts['run'].fadeOut(0.1)
        else if (acts['idle']) acts['idle'].fadeOut(0.1)
        acts['jump'].reset().fadeIn(0.1).play()
      }
    }
    prevJump.current = jumpPressed

    if (!onGround || verticalVelocity.current > 0) {
      smoothGroundH.current = null
      verticalVelocity.current -= GRAVITY * dt
      pos.y += verticalVelocity.current * dt
      if (groundH > -Infinity && pos.y < groundH) {
        pos.y = groundH
        verticalVelocity.current = 0
      }
    }

    // ── Move + wall collision ──
    pos.x += vel.x * dt
    pos.z += vel.y * dt

    const walls = resolveWalls(pos.x, pos.y, pos.z)
    pos.x += walls.dx
    pos.z += walls.dz

    const [rx, , rz] = resolveCollisions(pos.x, pos.y, pos.z, verticalVelocity.current)
    pos.x = rx
    pos.z = rz

    // ── Animation crossfade ──
    if (!isJumpingRef.current && isMoving !== isMovingRef.current) {
      const acts = actionsRef.current
      if (isMoving && acts['idle'] && acts['run']) {
        acts['idle'].crossFadeTo(acts['run'], 0.2, true); acts['run'].enabled = true; acts['run'].play()
      } else if (!isMoving && acts['run'] && acts['idle']) {
        acts['run'].crossFadeTo(acts['idle'], 0.2, true); acts['idle'].enabled = true; acts['idle'].play()
      }
      isMovingRef.current = isMoving
    }

    groupRef.current.rotation.y = currentRotation.current
    playerPosition.x = pos.x; playerPosition.y = pos.y; playerPosition.z = pos.z
    playerRotation.y = currentRotation.current; cameraInput.x = ix
  })

  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      <primitive object={model} scale={0.5} />
    </group>
  )
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * Math.min(t, 1)
}

useGLTF.preload('/models/character/Knight.glb')
useGLTF.preload('/models/character/anims/MovementBasic.glb')
useGLTF.preload('/models/character/anims/General.glb')
