'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { useEditorStore } from '@/stores/editorStore'
import { playerPosition, cameraInput, npcPositions } from '@/lib/playerRef'

const CAM_DISTANCE = 8
const CAM_HEIGHT = 4
const LOOK_HEIGHT = 1.9
const POSITION_DAMPING = 6
const CAM_TURN_SPEED = 1.5

const DIALOGUE_CAM_HEIGHT = 2.2
const DIALOGUE_CAM_SIDE = 2.5
const DIALOGUE_CAM_BACK = 3
const DIALOGUE_DAMPING = 3

export function CameraRig() {
  const { camera } = useThree()
  const currentAngle = useRef(0)
  const tmpTarget = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    // Skip when editor uses its own camera
    const { enabled: editorOn, cameraMode } = useEditorStore.getState()
    if (editorOn && cameraMode !== 'follow') return

    const dt = Math.min(delta, 0.05)
    const { x, y, z } = playerPosition

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
    const camX = x - Math.sin(angle) * CAM_DISTANCE
    const camZ = z - Math.cos(angle) * CAM_DISTANCE

    tmpTarget.current.set(camX, y + CAM_HEIGHT, camZ)
    tmpLook.current.set(x, y + LOOK_HEIGHT, z)

    camera.position.lerp(tmpTarget.current, 1 - Math.exp(-POSITION_DAMPING * dt))
    camera.lookAt(tmpLook.current)
  })

  return null
}
