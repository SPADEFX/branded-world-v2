'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { useGameStore } from '@/stores/gameStore'
import { useEditorStore } from '@/stores/editorStore'
import { playerPosition, npcPositions } from '@/lib/playerRef'
import { NPC_LIST } from '@/config/npcs'
import type { NPCConfig, NPCActivity, NPCProp } from '@/types'

const WANDER_RADIUS = 3
const WANDER_SPEED = 2
const IDLE_MIN = 3
const IDLE_MAX = 7

/* ── Map activity → animation clip name + source file ────── */

const ACTIVITY_CLIPS: Record<
  Exclude<NPCActivity, 'wander'>,
  { file: string; clip: string }
> = {
  idle: { file: 'General', clip: 'Idle_B' },
  fish: { file: 'Tools', clip: 'Fishing_Idle' },
  hammer: { file: 'Tools', clip: 'Hammering' },
  sit: { file: 'Simulation', clip: 'Sit_Floor_Idle' },
  wave: { file: 'Simulation', clip: 'Waving' },
  cheer: { file: 'Simulation', clip: 'Cheering' },
  combat: { file: 'CombatMelee', clip: 'Melee_1H_Attack_Slice_Horizontal' },
  magic: { file: 'CombatRanged', clip: 'Ranged_Magic_Spellcasting_Long' },
  sneak: { file: 'MovementAdvanced', clip: 'Sneaking' },
  guard: { file: 'CombatMelee', clip: 'Melee_2H_Idle' },
  bow: { file: 'CombatRanged', clip: 'Ranged_Bow_Aiming_Idle' },
}

/* ── Prop attachment (weapon/tool in hand) ─────────────────── */

function useAttachProp(
  model: THREE.Object3D,
  prop: NPCProp | undefined,
) {
  const propResult = useGLTF(prop?.model ?? '/models/character/Knight.glb')

  useEffect(() => {
    if (!prop) return
    const boneName = prop.slot === 'left' ? 'handslot.l' : 'handslot.r'
    let found: THREE.Object3D | null = null
    model.traverse((child) => {
      if (child.name === boneName) found = child
    })
    if (!found) return
    const bone = found as THREE.Object3D

    const propClone = propResult.scene.clone()
    propClone.scale.setScalar(prop.scale ?? 1)
    propClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).castShadow = true
      }
    })
    bone.add(propClone)
    return () => {
      bone.remove(propClone)
    }
  }, [model, prop, propResult.scene])
}

/* ── Speech bubble ───────────────────────────────────────── */

function SpeechBubble({ npcId }: { npcId: string }) {
  const editorEnabled = useEditorStore((s) => s.enabled)
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const isInDialogue = activeDialogue?.npcId === npcId

  if (editorEnabled || isInDialogue) return null

  return (
    <Html center position={[0, 2.2, 0]} distanceFactor={10} zIndexRange={[1, 0]}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '6px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
          fontSize: '13px',
          fontWeight: 500,
          color: '#444',
          userSelect: 'none',
          pointerEvents: 'none',
          animation: 'npcBubbleBob 2s ease-in-out infinite',
        }}
      >
        ...
      </div>
      <style>{`
        @keyframes npcBubbleBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </Html>
  )
}

/* ── Single NPC ──────────────────────────────────────────── */

function NPC({ id, position, rotation, model: modelPath, activity = 'wander', prop }: NPCConfig) {
  const { scene: srcModel } = useGLTF(modelPath)
  const { animations: moveAnims } = useGLTF('/models/character/anims/MovementBasic.glb')
  const { animations: generalAnims } = useGLTF('/models/character/anims/General.glb')
  const { animations: simAnims } = useGLTF('/models/character/anims/Simulation.glb')
  const { animations: toolAnims } = useGLTF('/models/character/anims/Tools.glb')
  const { animations: combatMeleeAnims } = useGLTF('/models/character/anims/CombatMelee.glb')
  const { animations: combatRangedAnims } = useGLTF('/models/character/anims/CombatRanged.glb')
  const { animations: moveAdvAnims } = useGLTF('/models/character/anims/MovementAdvanced.glb')
  const groupRef = useRef<THREE.Group>(null!)

  const model = useMemo(() => SkeletonUtils.clone(srcModel), [srcModel])

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [model])

  // Attach hand prop
  useAttachProp(model, prop)

  // ── Collect all anim clips by source file ──
  const animsByFile = useMemo(
    () => ({
      MovementBasic: moveAnims,
      General: generalAnims,
      Simulation: simAnims,
      Tools: toolAnims,
      CombatMelee: combatMeleeAnims,
      CombatRanged: combatRangedAnims,
      MovementAdvanced: moveAdvAnims,
    }),
    [moveAnims, generalAnims, simAnims, toolAnims, combatMeleeAnims, combatRangedAnims, moveAdvAnims],
  )

  const findClip = (file: string, name: string) =>
    animsByFile[file as keyof typeof animsByFile]?.find((c) => c.name === name)

  // Animation
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({})
  const wasInDialogue = useRef(false)

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model)
    mixerRef.current = mixer
    actionsRef.current = {}

    // Always register idle (for dialogue fallback)
    const idleClip = findClip('General', 'Idle_A')
    if (idleClip) {
      const action = mixer.clipAction(idleClip)
      actionsRef.current['idle'] = action
    }

    if (activity === 'wander') {
      // Wandering NPC: idle + run
      const runClip = findClip('MovementBasic', 'Running_A')
      if (runClip) {
        actionsRef.current['run'] = mixer.clipAction(runClip)
      }
      // Start idle with random offset
      if (actionsRef.current['idle']) {
        actionsRef.current['idle'].time = Math.random() * (idleClip?.duration ?? 1)
        actionsRef.current['idle'].play()
      }
    } else {
      // Stationary NPC: play activity clip
      const info = ACTIVITY_CLIPS[activity]
      const activityClip = findClip(info.file, info.clip)
      if (activityClip) {
        const action = mixer.clipAction(activityClip)
        action.time = Math.random() * activityClip.duration
        actionsRef.current['activity'] = action
        action.play()
      } else if (actionsRef.current['idle']) {
        // Fallback to idle if clip not found
        actionsRef.current['idle'].play()
      }
    }

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [model, activity, animsByFile])

  // Wander state (only used by wander NPCs)
  const stateRef = useRef<'idle' | 'walking'>('idle')
  const timerRef = useRef(Math.random() * (IDLE_MAX - IDLE_MIN) + IDLE_MIN)
  const targetRef = useRef(new THREE.Vector3(position[0], 0, position[2]))
  const spawnRef = useRef(new THREE.Vector3(position[0], 0, position[2]))
  const currentRotRef = useRef(rotation)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)
    mixerRef.current?.update(dt)

    const pos = groupRef.current.position

    // Publish position for proximity detection
    npcPositions[id] = { x: pos.x, z: pos.z }

    // Check if in dialogue
    const activeDialogue = useGameStore.getState().activeDialogue
    const inDialogue = activeDialogue?.npcId === id

    if (inDialogue) {
      // Face the player
      const dx = playerPosition.x - pos.x
      const dz = playerPosition.z - pos.z
      const targetRot = Math.atan2(dx, dz)
      let diff = targetRot - currentRotRef.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      currentRotRef.current += diff * Math.min(6 * dt, 1)
      groupRef.current.rotation.y = currentRotRef.current

      // Switch to idle when entering dialogue
      if (!wasInDialogue.current) {
        const acts = actionsRef.current
        const playing = activity === 'wander' && stateRef.current === 'walking' ? 'run' : 'activity'
        if (acts[playing] && acts['idle']) {
          acts[playing].crossFadeTo(acts['idle'], 0.3, true)
          acts['idle'].enabled = true
          acts['idle'].play()
        }
        if (activity === 'wander') stateRef.current = 'idle'
      }
      wasInDialogue.current = true
      return
    }

    // Exiting dialogue — resume activity
    if (wasInDialogue.current) {
      wasInDialogue.current = false
      const acts = actionsRef.current
      if (activity === 'wander') {
        timerRef.current = Math.random() * (IDLE_MAX - IDLE_MIN) + IDLE_MIN
        stateRef.current = 'idle'
      } else if (acts['activity'] && acts['idle']) {
        // Resume activity animation
        acts['idle'].crossFadeTo(acts['activity'], 0.3, true)
        acts['activity'].enabled = true
        acts['activity'].play()
      }
    }

    // Stationary NPCs don't need wander logic
    if (activity !== 'wander') return

    timerRef.current -= dt

    if (stateRef.current === 'idle') {
      if (timerRef.current <= 0) {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * WANDER_RADIUS
        targetRef.current.set(
          spawnRef.current.x + Math.cos(angle) * dist,
          0,
          spawnRef.current.z + Math.sin(angle) * dist,
        )
        stateRef.current = 'walking'

        const acts = actionsRef.current
        if (acts['idle'] && acts['run']) {
          acts['idle'].crossFadeTo(acts['run'], 0.2, true)
          acts['run'].enabled = true
          acts['run'].play()
        }
      }
    } else {
      const dx = targetRef.current.x - pos.x
      const dz = targetRef.current.z - pos.z
      const distToTarget = Math.sqrt(dx * dx + dz * dz)

      if (distToTarget < 0.15) {
        stateRef.current = 'idle'
        timerRef.current = Math.random() * (IDLE_MAX - IDLE_MIN) + IDLE_MIN

        const acts = actionsRef.current
        if (acts['run'] && acts['idle']) {
          acts['run'].crossFadeTo(acts['idle'], 0.2, true)
          acts['idle'].enabled = true
          acts['idle'].play()
        }
      } else {
        const nx = dx / distToTarget
        const nz = dz / distToTarget
        pos.x += nx * WANDER_SPEED * dt
        pos.z += nz * WANDER_SPEED * dt

        const targetRot = Math.atan2(nx, nz)
        let diff = targetRot - currentRotRef.current
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        currentRotRef.current += diff * Math.min(8 * dt, 1)
        groupRef.current.rotation.y = currentRotRef.current
      }
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <primitive object={model} scale={0.85} />
      <SpeechBubble npcId={id} />
    </group>
  )
}

/* ── Container ───────────────────────────────────────────── */

export function NPCs() {
  return (
    <group>
      {NPC_LIST.map((npc) => (
        <NPC key={npc.id} {...npc} />
      ))}
    </group>
  )
}

/* ── Preload ─────────────────────────────────────────────── */

NPC_LIST.forEach((npc) => useGLTF.preload(npc.model))
NPC_LIST.forEach((npc) => npc.prop && useGLTF.preload(npc.prop.model))
useGLTF.preload('/models/character/anims/MovementBasic.glb')
useGLTF.preload('/models/character/anims/General.glb')
useGLTF.preload('/models/character/anims/Simulation.glb')
useGLTF.preload('/models/character/anims/Tools.glb')
useGLTF.preload('/models/character/anims/CombatMelee.glb')
useGLTF.preload('/models/character/anims/CombatRanged.glb')
useGLTF.preload('/models/character/anims/MovementAdvanced.glb')
