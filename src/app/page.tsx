'use client'

import dynamic from 'next/dynamic'
import { Overlay } from '@/components/ui/Overlay'

const Experience = dynamic(
  () => import('@/components/canvas/Experience').then((m) => ({ default: m.Experience })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-light text-white">Loading World</h1>
          <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-white/50" />
          </div>
        </div>
      </div>
    ),
  },
)

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Experience />
      <Overlay />
    </main>
  )
}
