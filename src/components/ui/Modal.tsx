'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { ZONES } from '@/config/zones'
import { motion, AnimatePresence } from 'framer-motion'

export function Modal() {
  const activeModal = useGameStore((s) => s.activeModal)
  const closeModal = useGameStore((s) => s.closeModal)

  const zone = ZONES.find((z) => z.id === activeModal)

  // Close on Escape
  useEffect(() => {
    if (!activeModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeModal, closeModal])

  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 max-w-lg rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur-md"
          >
            {/* Category label */}
            <div
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: zone.color }}
            >
              {zone.label}
            </div>

            <h2 className="mb-1 text-2xl font-bold text-gray-900">
              {zone.content.title}
            </h2>

            <p className="mb-4 text-sm text-gray-500">{zone.content.subtitle}</p>

            <p className="mb-6 whitespace-pre-line leading-relaxed text-gray-700">
              {zone.content.body}
            </p>

            <div className="flex items-center gap-3">
              {zone.content.cta && (
                <a
                  href={zone.content.cta.href}
                  className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: zone.color }}
                >
                  {zone.content.cta.label}
                </a>
              )}
              <button
                onClick={closeModal}
                className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-[11px] text-gray-400">
              Press{' '}
              <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">ESC</kbd>{' '}
              or{' '}
              <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">E</kbd>{' '}
              to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
