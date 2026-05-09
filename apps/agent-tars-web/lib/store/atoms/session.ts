import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Session } from '@/lib/types'

// All sessions list
export const sessionsAtom = atom<Session[]>([])

// Current active session ID
export const currentSessionIdAtom = atomWithStorage<string | null>(
  'agent-tars-current-session',
  null
)

// Derived atom for current session
export const currentSessionAtom = atom((get) => {
  const sessions = get(sessionsAtom)
  const currentId = get(currentSessionIdAtom)
  return sessions.find((s) => s.id === currentId) ?? null
})

// Session search query
export const sessionSearchQueryAtom = atom('')

// Filtered sessions based on search
export const filteredSessionsAtom = atom((get) => {
  const sessions = get(sessionsAtom)
  const query = get(sessionSearchQueryAtom).toLowerCase().trim()
  
  if (!query) {
    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }
  
  return sessions
    .filter((session) => 
      session.title.toLowerCase().includes(query)
    )
    .sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
})
