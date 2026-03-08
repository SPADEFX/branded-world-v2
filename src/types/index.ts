export interface ZoneConfig {
  id: string
  label: string
  position: [number, number, number]
  radius: number
  color: string
  content: {
    title: string
    subtitle: string
    body: string
    cta?: {
      label: string
      href: string
    }
  }
}

export type NPCActivity =
  | 'wander'
  | 'fish'
  | 'hammer'
  | 'sit'
  | 'wave'
  | 'cheer'
  | 'idle'
  | 'combat'
  | 'magic'
  | 'sneak'
  | 'guard'
  | 'bow'

export interface NPCProp {
  model: string
  slot: 'left' | 'right'
  scale?: number
}

export interface NPCConfig {
  id: string
  name: string
  position: [number, number, number]
  rotation: number
  model: string
  dialogue: string[]
  activity?: NPCActivity
  prop?: NPCProp
}

export interface InputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  interact: boolean
  jump: boolean
}
