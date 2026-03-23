import type { NPCConfig } from '@/types'

export const NPC_LIST: NPCConfig[] = [
  // ── Village NPCs ─────────────────────────────────────────

  {
    id: 'npc-marco',
    name: 'Marco',
    position: [4, 0, 18],
    rotation: Math.PI,
    model: '/models/character/Barbarian.glb',
    activity: 'wander',
    prop: { model: '/models/props/weapons/axe_A.gltf', slot: 'right' },
    dialogue: [
      'Hey! Welcome to our world.',
      'Take a look around — there are a lot of things to discover here.',
      'If you see a glowing marker, walk up to it and press E!',
    ],
  },
  {
    id: 'npc-maya',
    name: 'Maya',
    position: [0, 0, -6],
    rotation: 0,
    model: '/models/character/Druid.glb',
    activity: 'cheer',
    prop: { model: '/models/props/weapons/staff_B.gltf', slot: 'right' },
    dialogue: [
      'Welcome to the plaza! This is the heart of the island.',
      "All the paths lead here. It's a great spot to start exploring.",
      'Have fun out there!',
    ],
  },
  {
    id: 'npc-guardian',
    name: 'Guardian',
    position: [2, 0, 2],
    rotation: Math.PI / 4,
    model: '/models/character/Paladin_with_Helmet.glb',
    activity: 'guard',
    prop: { model: '/models/props/weapons/sword_A.gltf', slot: 'right' },
    dialogue: [
      'I am the Guardian of the Solana Monument.',
      'This monument stands as a symbol of our community.',
      'May the blockchain guide your path, traveler.',
    ],
  },
  {
    id: 'npc-captain',
    name: 'Captain Sol',
    position: [6, 0, -4],
    rotation: -Math.PI / 4,
    model: '/models/character/Superhero.glb',
    activity: 'cheer',
    dialogue: [
      "I'm Captain Sol, protector of this island!",
      "Together we can build something amazing here.",
      "The community is our greatest superpower!",
    ],
  },

  // ── East zone ────────────────────────────────────────────

  {
    id: 'npc-aria',
    name: 'Aria',
    position: [22, 0, 7],
    rotation: -Math.PI / 3,
    model: '/models/character/Mage.glb',
    activity: 'magic',
    prop: { model: '/models/props/weapons/staff_A.gltf', slot: 'right' },
    dialogue: [
      'Oh, hi there! You look new around here.',
      'I was just practicing some spells. The magic here is... different.',
      'This place is full of surprises — keep exploring!',
    ],
  },
  {
    id: 'npc-kai',
    name: 'Kai',
    position: [24, 0, -2],
    rotation: Math.PI,
    model: '/models/character/Engineer.glb',
    activity: 'hammer',
    prop: { model: '/models/props/weapons/hammer_A.gltf', slot: 'right' },
    dialogue: [
      "Oh hey! I'm building something special over here.",
      "The ocean around this island is beautiful, isn't it?",
      'Sometimes I just stop working and watch the waves.',
    ],
  },
  {
    id: 'npc-byte',
    name: 'Byte',
    position: [18, 0, -10],
    rotation: Math.PI,
    model: '/models/character/Robot_One.glb',
    activity: 'wave',
    dialogue: [
      'BEEP BOOP! Hello, human friend!',
      'Processing... this island is 99.7% awesome.',
      'My circuits say you should explore more. GO GO GO!',
    ],
  },

  // ── West zone ────────────────────────────────────────────

  {
    id: 'npc-elena',
    name: 'Elena',
    position: [-22, 0, 7],
    rotation: -Math.PI / 4,
    model: '/models/character/Ranger.glb',
    activity: 'bow',
    prop: { model: '/models/props/weapons/bow_A_withString.gltf', slot: 'left' },
    dialogue: [
      'Hi! Have you visited the community zone yet?',
      "There's a campfire over there — the perfect spot to hang out.",
      "Don't forget to check out every corner of the island!",
    ],
  },
  {
    id: 'npc-ember',
    name: 'Ember',
    position: [-26, 0, 0],
    rotation: Math.PI / 4,
    model: '/models/character/Tiefling.glb',
    activity: 'combat',
    prop: { model: '/models/props/weapons/sword_A.gltf', slot: 'right' },
    dialogue: [
      'The flames of ambition burn bright here.',
      "I train every day to protect what we've built.",
      "This community is worth fighting for.",
    ],
  },

  // ── North zone ───────────────────────────────────────────

  {
    id: 'npc-sam',
    name: 'Sam',
    position: [14, 0, -20],
    rotation: Math.PI / 2,
    model: '/models/character/Rogue.glb',
    activity: 'fish',
    prop: { model: '/models/props/tools/fishing_rod.gltf', slot: 'right' },
    dialogue: [
      'Hey there, adventurer!',
      "The fishing is great around here. Want to try?",
      'The view from the edges is something else. Go take a look!',
    ],
  },
  {
    id: 'npc-trail',
    name: 'Trail',
    position: [-6, 0, -22],
    rotation: Math.PI,
    model: '/models/character/Hiker.glb',
    activity: 'wander',
    dialogue: [
      "Hey! Love the trails around here.",
      "I've mapped out every path on this island.",
      "The northern coast has the best views — trust me!",
    ],
  },
  {
    id: 'npc-jade',
    name: 'Jade',
    position: [-14, 0, -16],
    rotation: Math.PI / 4,
    model: '/models/character/Rogue_Hooded.glb',
    activity: 'sneak',
    prop: { model: '/models/props/weapons/dagger_A.gltf', slot: 'right' },
    dialogue: [
      "Psst! Over here...",
      "I've found some hidden treasures around the island.",
      "Look for sparkling gems if you have a sharp eye!",
    ],
  },

  // ── Beach zone ───────────────────────────────────────────

  {
    id: 'npc-darkblade',
    name: 'Darkblade',
    position: [-10, 0, 28],
    rotation: -Math.PI / 2,
    model: '/models/character/BlackKnight.glb',
    activity: 'guard',
    prop: { model: '/models/props/weapons/sword_B.gltf', slot: 'right' },
    dialogue: [
      'None shall pass without proving their worth.',
      "I've been guarding this area since the beginning.",
      "Only the worthy may enter... but you seem alright.",
    ],
  },
  {
    id: 'npc-grug',
    name: 'Grug',
    position: [30, 0, 38],
    rotation: -Math.PI / 3,
    model: '/models/character/Caveman.glb',
    activity: 'sit',
    prop: { model: '/models/props/weapons/spear_A.gltf', slot: 'right' },
    dialogue: [
      'Grug like this place!',
      'Grug find shiny rocks near water.',
      'You find shiny rocks too? Grug happy!',
    ],
  },
]

export const NPC_INTERACTION_RADIUS = 2.5
