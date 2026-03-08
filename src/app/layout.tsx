import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Branded World',
  description: 'An immersive 3D brand experience',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-hidden bg-slate-900">{children}</body>
    </html>
  )
}
