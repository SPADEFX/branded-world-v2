import type { ZoneConfig } from '@/types'

export const ZONES: ZoneConfig[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    position: [0, 0, 16],
    radius: 3,
    color: '#818cf8',
    content: {
      title: 'Welcome to Our World',
      subtitle: 'Explore and discover',
      body: 'Walk around this island to discover what we\'re building. Each glowing beacon holds a piece of our story. Get close and interact to learn more.',
    },
  },
  {
    id: 'product',
    label: 'Product',
    position: [20, 0, 5],
    radius: 3,
    color: '#34d399',
    content: {
      title: 'Our Product',
      subtitle: 'Built for the future',
      body: 'We\'re building the next generation of interactive experiences. Our platform combines cutting-edge 3D technology with intuitive design to create unforgettable digital moments.',
      cta: { label: 'Learn More', href: '#' },
    },
  },
  {
    id: 'how-it-works',
    label: 'How It Works',
    position: [12, 0, -18],
    radius: 3,
    color: '#fbbf24',
    content: {
      title: 'How It Works',
      subtitle: 'Simple yet powerful',
      body: '1. Define your world layout\n2. Add interaction points\n3. Customize content and styling\n4. Deploy and share with the world\n\nOur platform handles the complexity so you can focus on creativity.',
    },
  },
  {
    id: 'community',
    label: 'Community',
    position: [-12, 0, -18],
    radius: 3,
    color: '#f472b6',
    content: {
      title: 'Join the Community',
      subtitle: 'Connect with creators',
      body: 'Thousands of creators are already building immersive experiences. Join our community to share ideas, get feedback, and collaborate on the future of interactive web.',
      cta: { label: 'Join Discord', href: '#' },
    },
  },
  {
    id: 'cta',
    label: 'Get Started',
    position: [-20, 0, 5],
    radius: 3,
    color: '#fb923c',
    content: {
      title: 'Ready to Start?',
      subtitle: 'Your world awaits',
      body: 'Start building your own immersive experience today. No 3D expertise required — our tools make it easy for anyone to create stunning interactive worlds.',
      cta: { label: 'Get Started Free', href: '#' },
    },
  },
]
