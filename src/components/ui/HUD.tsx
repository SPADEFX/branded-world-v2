'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { ZONES } from '@/config/zones'
import { NPC_LIST } from '@/config/npcs'
import { COLLECTIBLES } from '@/config/collectibles'
import { motion, AnimatePresence } from 'framer-motion'

interface HUDProps {
  isMobile: boolean
}

export function HUD({ isMobile }: HUDProps) {
  const nearbyZone = useGameStore((s) => s.nearbyZone)
  const nearbyNPC = useGameStore((s) => s.nearbyNPC)
  const visitedZones = useGameStore((s) => s.visitedZones)
  const activeModal = useGameStore((s) => s.activeModal)
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const score = useGameStore((s) => s.score)
  const collectedCount = useGameStore((s) => s.collectedIds.length)
  const lastCollected = useGameStore((s) => s.lastCollected)

  // Flash animation for score popup
  const [popup, setPopup] = useState<{ points: number; key: number } | null>(null)
  useEffect(() => {
    if (!lastCollected) return
    setPopup({ points: lastCollected.points, key: lastCollected.time })
    const timer = setTimeout(() => setPopup(null), 1200)
    return () => clearTimeout(timer)
  }, [lastCollected])

  const zone = ZONES.find((z) => z.id === nearbyZone)
  const npc = NPC_LIST.find((n) => n.id === nearbyNPC)

  return (
    <>
      {/* Top-right stats */}
      <div className="pointer-events-none absolute top-6 right-6 flex flex-col items-end gap-2">
        {/* Discovery counter */}
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 backdrop-blur-md">
          <span className="text-sm font-medium text-white/90">
            {visitedZones.length}/{ZONES.length}
          </span>
          <span className="text-xs text-white/50">discovered</span>
        </div>

        {/* Gem counter */}
        <div className="relative flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 backdrop-blur-md">
          <span style={{ fontSize: '14px' }}>&#x1F48E;</span>
          <span className="text-sm font-medium text-white/90">
            {collectedCount}/{COLLECTIBLES.length}
          </span>
          <span className="text-xs text-white/50">
            ({score} pts)
          </span>
          {/* Score popup */}
          <AnimatePresence>
            {popup && (
              <motion.span
                key={popup.key}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute -top-2 right-0 text-sm font-bold text-yellow-300"
              >
                +{popup.points}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Interaction prompt */}
      <AnimatePresence>
        {!activeModal && !activeDialogue && (npc || zone) && (
          <motion.div
            key={npc ? npc.id : zone!.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-black/40 px-6 py-3 backdrop-blur-md">
              <span className="text-lg font-semibold text-white">
                {npc ? npc.name : zone!.label}
              </span>
              <span className="text-xs text-white/60">
                {isMobile ? (
                  npc ? 'Tap to talk' : 'Tap the button to explore'
                ) : (
                  <>
                    Press{' '}
                    <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[11px]">
                      E
                    </kbd>{' '}
                    {npc ? 'to talk' : 'to explore'}
                  </>
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
