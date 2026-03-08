'use client'

import { useEffect, useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditorStore, editorRefs } from '@/stores/editorStore'
import type { UndoEntry } from '@/stores/editorStore'

export function EditorGizmo() {
  const enabled = useEditorStore((s) => s.enabled)
  const selectedId = useEditorStore((s) => s.selectedId)
  const mode = useEditorStore((s) => s.mode)
  const controlsRef = useRef<any>(null)
  const preDragRef = useRef<UndoEntry | null>(null)

  const target = selectedId ? editorRefs[selectedId] : null

  /* Sync TransformControls events → store (only on drag end to avoid
     re-render fighting with TransformControls during drag) */
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !target || !selectedId) return

    const onDraggingChanged = () => {
      // Read dragging state from the controls object directly (reliable across Three.js versions)
      const isDragging: boolean = controls.dragging ?? false
      useEditorStore.getState().setDragging(isDragging)

      if (isDragging) {
        // Drag START — capture pre-drag state for undo
        preDragRef.current = {
          id: selectedId,
          position: [target.position.x, target.position.y, target.position.z],
          rotation: target.rotation.y,
        }
      } else {
        // Drag END — push undo entry, then sync new state to store
        if (preDragRef.current) {
          useEditorStore.getState().pushUndo(preDragRef.current)
          preDragRef.current = null
        }
        const { updatePosition, updateRotation } = useEditorStore.getState()
        updatePosition(selectedId, target.position.clone())
        updateRotation(selectedId, target.rotation.y)
      }
    }

    controls.addEventListener('dragging-changed', onDraggingChanged)
    return () => {
      controls.removeEventListener('dragging-changed', onDraggingChanged)
    }
  }, [selectedId, target])

  /* Keyboard shortcuts when editor is active */
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return

      const state = useEditorStore.getState()
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        state.undo()
        return
      }
      if (e.key === 'Escape') {
        if (state.placingModel) state.setPlacingModel(null)
        else if (state.eraserMode) state.setEraserMode(false)
        else state.select(null)
      }
      if (e.key === 'g') state.setMode('translate')
      if (e.key === 'r') state.setMode('rotate')
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          state.removeObject(state.selectedId)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled])

  if (!enabled || !target) return null

  return <TransformControls ref={controlsRef} object={target} mode={mode} />
}
