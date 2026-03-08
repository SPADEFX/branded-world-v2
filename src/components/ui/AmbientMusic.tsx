'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const audio = new Audio('/audio/ambient.ogg')
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio
    setReady(true)

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  if (!ready) return null

  return (
    <button
      onClick={toggle}
      className="pointer-events-auto absolute top-6 left-6 flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 backdrop-blur-md transition-colors hover:bg-black/50"
    >
      <AnimatePresence mode="wait">
        {playing ? (
          <motion.div
            key="playing"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 rounded-full bg-white"
                animate={{ height: [4, 12, 4] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="paused"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-white/90 text-sm"
          >
            &#9835;
          </motion.div>
        )}
      </AnimatePresence>
      <span className="text-xs font-medium text-white/70">
        {playing ? 'Music On' : 'Music Off'}
      </span>
    </button>
  )
}
