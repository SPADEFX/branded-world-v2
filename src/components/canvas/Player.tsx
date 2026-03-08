'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useInput } from '@/hooks/useInput'
import { useGameStore } from '@/stores/gameStore'
import { playerPosition, playerRotation, cameraInput, npcPositions } from '@/lib/playerRef'
import { resolveCollisions, getGroundHeight } from '@/lib/hitboxes'
import { isInsideLand } from '@/lib/worldShape'

const MOVE_SPEED = 6
const ACCELERATION = 10
const DECELERATION = 8
const ROTATION_SPEED = 12
const JUMP_FORCE = 6
const GRAVITY = 14
const DIALOGUE_STAND_DIST = 1.8
const DIALOGUE_MOVE_SPEED = 4
const _camDir = new THREE.Vector3()

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
  const keys = useInput()

  // ── Load model + animations ──
  const { scene: model } = useGLTF('/models/character/Knight.glb')
  const { animations: moveAnims } = useGLTF('/models/character/anims/MovementBasic.glb')
  const { animations: generalAnims } = useGLTF('/models/character/anims/General.glb')

  // ── Apply texture + shadows ──
  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [model])

  // ── Manual AnimationMixer ──
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

    if (runClip) {
      actionsRef.current['run'] = mixer.clipAction(runClip)
    }

    if (jumpClip) {
      const action = mixer.clipAction(jumpClip)
      action.loop = THREE.LoopOnce
      action.clampWhenFinished = true
      actionsRef.current['jump'] = action
    }

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [model, moveAnims, generalAnims])

  // ── Game loop ──
  useFrame((_, delta) => {
    if (!groupRef.current) return

    const dt = Math.min(delta, 0.05)
    mixerRef.current?.update(dt)

    const state = useGameStore.getState()
    const { joystickInput, activeModal, activeDialogue, nearbyZone, nearbyNPC, showOnboarding } = state

    // ── Interaction ──
    const interact = keys.current.interact
    if (interact && !prevInteract.current) {
      if (activeDialogue) {
        state.advanceDialogue()
      } else if (activeModal) {
        state.closeModal()
      } else if (nearbyNPC && !showOnboarding) {
        state.openDialogue(nearbyNPC)
      } else if (nearbyZone && !showOnboarding) {
        state.openModal(nearbyZone)
      }
    }
    prevInteract.current = interact

    if (activeModal || showOnboarding) return

    // ── Dialogue positioning: walk to NPC and face them ──
    if (activeDialogue) {
      const npcPos = npcPositions[activeDialogue.npcId]
      if (npcPos) {
        const pos = groupRef.current.position
        const dx = npcPos.x - pos.x
        const dz = npcPos.z - pos.z
        const dist = Math.sqrt(dx * dx + dz * dz)

        const gap = Math.abs(dist - DIALOGUE_STAND_DIST)

        if (gap > 0.1) {
          // Move toward or away from NPC to reach DIALOGUE_STAND_DIST
          const nx = dx / dist
          const nz = dz / dist
          const sign = dist > DIALOGUE_STAND_DIST ? 1 : -1 // 1 = approach, -1 = back up
          const step = Math.min(DIALOGUE_MOVE_SPEED * dt, gap)
          pos.x += nx * sign * step
          pos.z += nz * sign * step

          // Switch to run/walk if not already
          if (!isMovingRef.current) {
            const acts = actionsRef.current
            if (acts['idle'] && acts['run']) {
              acts['idle'].crossFadeTo(acts['run'], 0.2, true)
              acts['run'].enabled = true
              acts['run'].play()
            }
            isMovingRef.current = true
          }
        } else {
          // In position — switch to idle
          if (isMovingRef.current) {
            const acts = actionsRef.current
            if (acts['run'] && acts['idle']) {
              acts['run'].crossFadeTo(acts['idle'], 0.2, true)
              acts['idle'].enabled = true
              acts['idle'].play()
            }
            isMovingRef.current = false
          }
        }

        // Rotate to face NPC
        const targetRot = Math.atan2(dx, dz)
        currentRotation.current = lerpAngle(currentRotation.current, targetRot, 8 * dt)
        groupRef.current.rotation.y = currentRotation.current

        // Publish position
        playerPosition.x = pos.x
        playerPosition.y = pos.y
        playerPosition.z = pos.z
        playerRotation.y = currentRotation.current
        cameraInput.x = 0
      }
      return
    }

    // ── Gather input ──
    let ix = 0
    let iz = 0

    if (keys.current.forward) iz -= 1
    if (keys.current.backward) iz += 1
    if (keys.current.left) ix -= 1
    if (keys.current.right) ix += 1

    if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) {
      ix = joystickInput.x
      iz = joystickInput.y
    }

    const len = Math.sqrt(ix * ix + iz * iz)
    if (len > 1) { ix /= len; iz /= len }

    // ── Transform input to camera-relative world space ──
    camera.getWorldDirection(_camDir)
    _camDir.y = 0
    _camDir.normalize()
    const rx = -_camDir.z
    const rz = _camDir.x
    const wx = ix * rx + (-iz) * _camDir.x
    const wz = ix * rz + (-iz) * _camDir.z

    // ── Velocity ──
    const vel = velocityRef.current
    const isMoving = len > 0.1

    if (isMoving) {
      vel.x = THREE.MathUtils.lerp(vel.x, wx * MOVE_SPEED, ACCELERATION * dt)
      vel.y = THREE.MathUtils.lerp(vel.y, wz * MOVE_SPEED, ACCELERATION * dt)
      // Character always turns to face movement direction
      const targetRot = Math.atan2(wx, wz)
      currentRotation.current = lerpAngle(currentRotation.current, targetRot, ROTATION_SPEED * dt)
    } else {
      vel.x = THREE.MathUtils.lerp(vel.x, 0, DECELERATION * dt)
      vel.y = THREE.MathUtils.lerp(vel.y, 0, DECELERATION * dt)
    }

    // ── Jump ──
    const pos = groupRef.current.position
    const groundH = getGroundHeight(pos.x, pos.y, pos.z)
    const onGround = pos.y <= groundH + 0.01
    const jumpPressed = keys.current.jump

    if (jumpPressed && !prevJump.current && onGround && !isJumpingRef.current) {
      verticalVelocity.current = JUMP_FORCE
      isJumpingRef.current = true

      // Play jump animation
      const acts = actionsRef.current
      if (acts['jump']) {
        // Fade out current anim
        if (isMoving && acts['run']) acts['run'].fadeOut(0.1)
        else if (acts['idle']) acts['idle'].fadeOut(0.1)
        acts['jump'].reset().fadeIn(0.1).play()
      }
    }
    prevJump.current = jumpPressed

    // Apply gravity
    if (!onGround || verticalVelocity.current > 0) {
      verticalVelocity.current -= GRAVITY * dt
      pos.y += verticalVelocity.current * dt

      // Land on ground (or hitbox surface)
      if (pos.y <= groundH) {
        pos.y = groundH
        verticalVelocity.current = 0

        if (isJumpingRef.current) {
          isJumpingRef.current = false
          const acts = actionsRef.current
          if (acts['jump']) acts['jump'].fadeOut(0.15)
          if (isMoving && acts['run']) {
            acts['run'].reset().fadeIn(0.15).play()
          } else if (acts['idle']) {
            acts['idle'].reset().fadeIn(0.15).play()
          }
        }
      }
    }

    // ── Animation crossfade (idle ↔ run, only when grounded) ──
    if (!isJumpingRef.current && isMoving !== isMovingRef.current) {
      const acts = actionsRef.current
      if (isMoving && acts['idle'] && acts['run']) {
        acts['idle'].crossFadeTo(acts['run'], 0.2, true)
        acts['run'].enabled = true
        acts['run'].play()
      } else if (!isMoving && acts['run'] && acts['idle']) {
        acts['run'].crossFadeTo(acts['idle'], 0.2, true)
        acts['idle'].enabled = true
        acts['idle'].play()
      }
      isMovingRef.current = isMoving
    }

    // ── Apply position ──
    pos.x += vel.x * dt
    pos.z += vel.y * dt

    // ── Hitbox collision (AABB boxes) ──
    const [cx, landY, cz] = resolveCollisions(pos.x, pos.y, pos.z, verticalVelocity.current)
    pos.x = cx
    pos.z = cz

    // Land on top of a hitbox
    if (landY > 0 && pos.y <= landY + 0.05 && verticalVelocity.current <= 0) {
      pos.y = landY
      verticalVelocity.current = 0
      if (isJumpingRef.current) {
        isJumpingRef.current = false
        const acts = actionsRef.current
        if (acts['jump']) acts['jump'].fadeOut(0.15)
        if (isMoving && acts['run']) {
          acts['run'].reset().fadeIn(0.15).play()
        } else if (acts['idle']) {
          acts['idle'].reset().fadeIn(0.15).play()
        }
      }
    }

    // Polygon boundary — push back to previous valid position
    if (!isInsideLand(pos.x, pos.z)) {
      pos.x = playerPosition.x
      pos.z = playerPosition.z
    }

    // ── Apply rotation ──
    groupRef.current.rotation.y = currentRotation.current

    // ── Publish position + rotation ──
    playerPosition.x = pos.x
    playerPosition.y = pos.y
    playerPosition.z = pos.z
    playerRotation.y = currentRotation.current
    cameraInput.x = ix
  })

  return (
    <group ref={groupRef} position={[0, 0, 20]}>
      <primitive object={model} scale={0.85} />
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
