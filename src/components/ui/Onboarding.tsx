'use client'

import { useGameStore } from '@/stores/gameStore'
import { motion, AnimatePresence } from 'framer-motion'

export function Onboarding() {
  const show = useGameStore((s) => s.showOnboarding)
  const dismiss = useGameStore((s) => s.dismissOnboarding)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
            className="mx-4 max-w-md text-center"
          >
            <h1 className="mb-3 text-4xl font-bold text-white">Welcome</h1>
            <p className="mb-2 text-lg text-white/80">
              Explore this world and discover what we&apos;ve built.
            </p>
            <p className="mb-8 text-sm text-white/50">
              Move with WASD or arrow keys. Press E near glowing beacons to interact.
              <br />
              On mobile, use the joystick and action button.
            </p>
            <button
              onClick={dismiss}
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              Start Exploring
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
