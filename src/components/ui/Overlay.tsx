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
import { PropViewerHUD } from './PropViewerHUD'

export function Overlay() {
  const [isMobile, setIsMobile] = useState(false)

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
      <EditorSidebar />
      <DoorsSidebar />
      <BottomNav />
      <PropViewerHUD />
      {isMobile && <MobileControls />}
    </div>
  )
}
