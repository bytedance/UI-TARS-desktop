import { NextResponse } from 'next/server'

// In-memory session storage (shared with parent route in production via database)
const sessions: Map<string, unknown> = new Map()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const session = sessions.get(sessionId)
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json(session)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const session = sessions.get(sessionId)
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const updates = await request.json()
  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  sessions.set(sessionId, updated)
  
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  sessions.delete(sessionId)
  return new NextResponse(null, { status: 204 })
}
