'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditorStore } from '@/stores/editorStore'

interface NavItem {
  id: string
  icon: string
  label: string
  sub?: { id: string; icon: string; label: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'collision',
    icon: '🎯',
    label: 'Collision',
  },
  {
    id: 'camera',
    icon: '🎥',
    label: 'Caméra libre',
    sub: [
      { id: 'activate', icon: '📷', label: 'Activer' },
      { id: 'culling', icon: '🔵', label: 'Culling' },
    ],
  },
  {
    id: 'doors',
    icon: '🚪',
    label: 'Portes',
    sub: [
      { id: 'place', icon: '＋', label: 'Placer' },
      { id: 'view', icon: '👁', label: 'Voir' },
    ],
  },
]

function NavBtn({
  icon, label, active, onClick,
}: {
  icon: string; label: string; active?: boolean; onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className="pointer-events-auto relative flex flex-col items-center gap-1 px-5 py-2.5 select-none group"
      style={{ minWidth: 72 }}
    >
      {/* Active glow */}
      {active && (
        <motion.div
          layoutId="nav-active-bg"
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'radial-gradient(ellipse at 50% 120%, rgba(251,191,36,0.18) 0%, transparent 70%)',
            border: '1px solid rgba(251,191,36,0.3)',
          }}
        />
      )}

      <span
        className="text-xl leading-none relative z-10 transition-transform duration-150 group-hover:scale-110"
        style={{ filter: active ? 'drop-shadow(0 0 6px rgba(251,191,36,0.7))' : undefined }}
      >
        {icon}
      </span>
      <span
        className="relative z-10 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150"
        style={{
          color: active ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.45)',
          textShadow: active ? '0 0 12px rgba(251,191,36,0.5)' : undefined,
        }}
      >
        {label}
      </span>
    </motion.button>
  )
}

export function BottomNav() {
  const [openSub, setOpenSub] = useState<string | null>(null)

  const freeCamActive = useEditorStore((s) => s.freeCamActive)
  const setFreeCamActive = useEditorStore((s) => s.setFreeCamActive)
  const cullingDebug = useEditorStore((s) => s.cullingDebug)
  const setCullingDebug = useEditorStore((s) => s.setCullingDebug)
  const propViewerOpen = useEditorStore((s) => s.propViewerOpen)
  const setPropViewerOpen = useEditorStore((s) => s.setPropViewerOpen)
  const setPropViewerIndex = useEditorStore((s) => s.setPropViewerIndex)
  const placeDoorMode = useEditorStore((s) => s.placeDoorMode)
  const setPlaceDoorMode = useEditorStore((s) => s.setPlaceDoorMode)
  const viewDoorsMode = useEditorStore((s) => s.viewDoorsMode)
  const setViewDoorsMode = useEditorStore((s) => s.setViewDoorsMode)

  const doorsActive = placeDoorMode || viewDoorsMode

  function handleMain(id: string) {
    if (id === 'collision') {
      const next = !propViewerOpen
      setPropViewerOpen(next)
      if (next) {
        setPropViewerIndex(0)
        if (document.pointerLockElement) document.exitPointerLock()
        setFreeCamActive(true)
      }
      setOpenSub(null)
    } else if (id === 'camera') {
      setOpenSub(openSub === 'camera' ? null : 'camera')
    } else if (id === 'doors') {
      setOpenSub(openSub === 'doors' ? null : 'doors')
    }
  }

  function handleSub(parentId: string, subId: string) {
    if (parentId === 'camera') {
      if (subId === 'activate') {
        if (document.pointerLockElement) document.exitPointerLock()
        setFreeCamActive(!freeCamActive)
      } else if (subId === 'culling') {
        setCullingDebug(!cullingDebug)
      }
    } else if (parentId === 'doors') {
      if (subId === 'place') {
        const next = !placeDoorMode
        setPlaceDoorMode(next)
        if (next) setViewDoorsMode(true)
        else if (!viewDoorsMode) { /* keep sidebar open via viewDoorsMode */ }
      } else if (subId === 'view') {
        const next = !viewDoorsMode
        setViewDoorsMode(next)
        if (next) setPlaceDoorMode(false)
      }
    }
    setOpenSub(null)
  }

  function isActive(id: string) {
    if (id === 'collision') return propViewerOpen
    if (id === 'camera') return freeCamActive || cullingDebug
    if (id === 'doors') return doorsActive
    return false
  }

  const barStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(36,24,8,0.96) 0%, rgba(22,14,4,0.98) 100%)',
    border: '1px solid rgba(160,110,40,0.45)',
    boxShadow: '0 -1px 0 rgba(255,200,60,0.07) inset, 0 8px 40px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)',
    borderRadius: 20,
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">

      {/* Sub-menu */}
      <AnimatePresence>
        {openSub && (
          <motion.div
            key={openSub}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-1.5"
            style={barStyle}
          >
            {NAV_ITEMS.find((i) => i.id === openSub)?.sub?.map((sub) => {
              const isSubActive =
                (openSub === 'camera' && sub.id === 'activate' && freeCamActive) ||
                (openSub === 'camera' && sub.id === 'culling' && cullingDebug) ||
                (openSub === 'doors' && sub.id === 'place' && placeDoorMode) ||
                (openSub === 'doors' && sub.id === 'view' && viewDoorsMode)
              return (
                <NavBtn
                  key={sub.id}
                  icon={sub.icon}
                  label={sub.label}
                  active={isSubActive}
                  onClick={() => handleSub(openSub, sub.id)}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <div
        className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-1.5"
        style={barStyle}
      >
        {/* Separator line between items */}
        {NAV_ITEMS.map((item, i) => (
          <div key={item.id} className="flex items-center">
            {i > 0 && (
              <div className="w-px h-8 mx-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
            )}
            <NavBtn
              icon={item.icon}
              label={item.label}
              active={isActive(item.id)}
              onClick={() => handleMain(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
