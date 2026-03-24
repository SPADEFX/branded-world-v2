'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPosition } from '@/lib/playerRef'
import { isIndoorsRef } from '@/lib/playerRef'
import { DOOR_TRIGGERS } from '@/config/indoorZones'

export function DoorTriggers() {
  const insideDoors = useRef(new Set<string>())

  useFrame(() => {
    if (!DOOR_TRIGGERS.length) return

    const px = playerPosition.x
    const pz = playerPosition.z

    for (const door of DOOR_TRIGGERS) {
      const dx = px - door.x
      const dz = pz - door.z
      const inRadius = dx * dx + dz * dz < door.radius * door.radius
      const wasInside = insideDoors.current.has(door.id)

      if (inRadius && !wasInside) {
        insideDoors.current.add(door.id)
        isIndoorsRef.current = !isIndoorsRef.current
      } else if (!inRadius && wasInside) {
        insideDoors.current.delete(door.id)
      }
    }
  })

  return null
}
