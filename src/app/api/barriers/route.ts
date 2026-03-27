import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'

const FILE_PATH = path.join(process.cwd(), 'src/config/mapBarriers.json')

export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  await writeFile(FILE_PATH, JSON.stringify(body, null, 2), 'utf-8')
  return NextResponse.json({ ok: true })
}
