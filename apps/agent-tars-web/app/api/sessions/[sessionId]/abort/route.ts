import { NextResponse } from 'next/server'

// In production, this would manage active request tracking
const activeRequests: Map<string, AbortController> = new Map()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  
  const controller = activeRequests.get(sessionId)
  if (controller) {
    controller.abort()
    activeRequests.delete(sessionId)
    return NextResponse.json({ success: true, message: 'Request aborted' })
  }
  
  return NextResponse.json({ success: false, message: 'No active request found' })
}

// Export for use in message route
export function registerRequest(sessionId: string, controller: AbortController) {
  activeRequests.set(sessionId, controller)
}

export function unregisterRequest(sessionId: string) {
  activeRequests.delete(sessionId)
}
