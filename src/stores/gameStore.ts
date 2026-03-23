import { create } from 'zustand'
import { NPC_LIST } from '@/config/npcs'

interface GameState {
  // Interaction
  nearbyZone: string | null
  activeModal: string | null
  visitedZones: string[]

  // NPC
  nearbyNPC: string | null
  activeDialogue: { npcId: string; lineIndex: number } | null

  // Onboarding
  showOnboarding: boolean

  // Mobile input
  joystickInput: { x: number; y: number }

  // Actions
  setNearbyZone: (id: string | null) => void
  openModal: (id: string) => void
  closeModal: () => void
  openDialogue: (npcId: string) => void
  advanceDialogue: () => void
  closeDialogue: () => void
  dismissOnboarding: () => void
  setJoystickInput: (input: { x: number; y: number }) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  nearbyZone: null,
  activeModal: null,
  visitedZones: [],
  nearbyNPC: null,
  activeDialogue: null,
  showOnboarding: true,
  joystickInput: { x: 0, y: 0 },

  setNearbyZone: (id) => set({ nearbyZone: id }),

  openModal: (id) => {
    const visited = get().visitedZones
    set({
      activeModal: id,
      visitedZones: visited.includes(id) ? visited : [...visited, id],
    })
  },

  closeModal: () => set({ activeModal: null }),

  openDialogue: (npcId) => set({ activeDialogue: { npcId, lineIndex: 0 } }),

  advanceDialogue: () => {
    const dialogue = get().activeDialogue
    if (!dialogue) return
    const npc = NPC_LIST.find((n) => n.id === dialogue.npcId)
    if (!npc || dialogue.lineIndex >= npc.dialogue.length - 1) {
      set({ activeDialogue: null })
    } else {
      set({ activeDialogue: { ...dialogue, lineIndex: dialogue.lineIndex + 1 } })
    }
  },

  closeDialogue: () => set({ activeDialogue: null }),

  dismissOnboarding: () => set({ showOnboarding: false }),
  setJoystickInput: (input) => set({ joystickInput: input }),
}))
