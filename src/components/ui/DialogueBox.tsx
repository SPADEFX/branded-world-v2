'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { NPC_LIST } from '@/config/npcs'
import { motion, AnimatePresence } from 'framer-motion'

const TYPEWRITER_SPEED = 30 // ms per character

export function DialogueBox() {
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const npc = activeDialogue ? NPC_LIST.find((n) => n.id === activeDialogue.npcId) : null
  const fullText = npc && activeDialogue ? npc.dialogue[activeDialogue.lineIndex] ?? '' : ''
  const isLast = npc && activeDialogue ? activeDialogue.lineIndex >= npc.dialogue.length - 1 : false

  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Typewriter effect
  useEffect(() => {
    if (!fullText) {
      setDisplayedText('')
      setIsTyping(false)
      return
    }

    setDisplayedText('')
    setIsTyping(true)
    let index = 0

    const tick = () => {
      index++
      setDisplayedText(fullText.slice(0, index))
      if (index < fullText.length) {
        timerRef.current = setTimeout(tick, TYPEWRITER_SPEED)
      } else {
        setIsTyping(false)
      }
    }

    timerRef.current = setTimeout(tick, TYPEWRITER_SPEED)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [fullText])

  return (
    <AnimatePresence>
      {activeDialogue && npc && (
        <motion.div
          key="dialogue-backdrop"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
        >
          <div className="rounded-2xl bg-white/95 px-8 py-6 shadow-2xl backdrop-blur-md">
            {/* NPC name */}
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
              {npc.name}
            </div>

            {/* Dialogue text */}
            <p className="min-h-[3rem] text-base leading-relaxed text-gray-800">
              {displayedText}
              {isTyping && (
                <span className="animate-pulse text-gray-400">|</span>
              )}
            </p>

            {/* Continue hint */}
            <div className="mt-3 text-right">
              <span className="text-[11px] text-gray-400">
                Press{' '}
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">E</kbd>{' '}
                {isLast ? 'to close' : 'to continue'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
