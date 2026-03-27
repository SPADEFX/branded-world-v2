'use client'

import { useState, useEffect } from 'react'
import { HUD } from './HUD'
import { Modal } from './Modal'
import { Onboarding } from './Onboarding'
import { MobileControls } from './MobileControls'
import { DialogueBox } from './DialogueBox'
import { AmbientMusic } from './AmbientMusic'
import { EditorSidebar } from './EditorSidebar'
import { BottomNav } from './BottomNav'
import { DoorsSidebar } from './DoorsSidebar'
import { MapBarriersSidebar } from './MapBarriersSidebar'
import { PropViewerHUD } from './PropViewerHUD'

export function Overlay() {
  const [isMobile, setIsMobile] = useState(false)
  const [adminMode, setAdminMode] = useState(true)

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <Onboarding />
      <HUD isMobile={isMobile} />
      <Modal />
      <DialogueBox />
      <AmbientMusic />

      {adminMode && (
        <>
          <EditorSidebar />
          <DoorsSidebar />
          <MapBarriersSidebar />
          <BottomNav />
          <PropViewerHUD />
        </>
      )}

      {/* Admin toggle */}
      <button
        onClick={() => setAdminMode((v) => !v)}
        className="pointer-events-auto fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-widest uppercase transition-all select-none"
        style={{
          background: adminMode ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
          border: adminMode ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.12)',
          color: adminMode ? 'rgb(253,224,71)' : 'rgba(255,255,255,0.3)',
        }}
      >
        {adminMode ? '⚙ Admin' : '⚙'}
      </button>

      {isMobile && <MobileControls />}
    </div>
  )
}
