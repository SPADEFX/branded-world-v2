/** Smooth camera animation for the prop viewer — consumed by EditorCamera FreeOrbitView. */
export interface PropCameraAnim {
  startPx: number; startPy: number; startPz: number
  endPx: number;   endPy: number;   endPz: number
  startTx: number; startTy: number; startTz: number
  endTx: number;   endTy: number;   endTz: number
  startTime: number
  duration: number  // ms
}

export const propViewerCameraAnim: { current: PropCameraAnim | null } = { current: null }

/** Current editor camera state — written by EditorCamera useFrame, read by PropViewerHighlight. */
export const currentEditorCam = { px: 0, py: 20, pz: 20, tx: 0, ty: 0, tz: 0 }

/** Fly-to function — set by PropViewerHighlight, called by PropViewerHUD buttons. */
export const propViewerFlyTo: { current: ((index: number) => void) | null } = { current: null }
