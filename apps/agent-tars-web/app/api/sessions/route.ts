import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { Session } from '@/lib/types'

// In-memory session storage (replace with database in production)
const sessions: Map<string, Session> = new Map()

export async function GET() {
  const allSessions = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  return NextResponse.json(allSessions)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const session: Session = {
    id: uuidv4(),
    title: body.title || 'New Session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      totalMessages: 0,
      ...body.metadata,
    },
  }
  
  sessions.set(session.id, session)
  
  return NextResponse.json(session, { status: 201 })
}
