'use client'

import { useAtom, useAtomValue } from 'jotai'
import { filteredSessionsAtom, currentSessionIdAtom, sessionsAtom } from '@/lib/store'
import { SessionItem } from './session-item'
import { MessageSquare } from 'lucide-react'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'

interface SessionListProps {
  collapsed?: boolean
}

export function SessionList({ collapsed = false }: SessionListProps) {
  const filteredSessions = useAtomValue(filteredSessionsAtom)
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const router = useRouter()

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    router.push(`/${sessionId}`)
  }

  const handleDeleteSession = (sessionId: string) => {
    setSessions(sessions.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId)
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id)
        router.push(`/${remaining[0].id}`)
      } else {
        setCurrentSessionId(null)
        router.push('/')
      }
    }
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        {!collapsed && (
          <>
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new session to begin
            </p>
          </>
        )}
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-2 py-1">
        {filteredSessions.slice(0, 10).map((session) => (
          <Tooltip key={session.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSelectSession(session.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors mx-auto ${
                  currentSessionId === session.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/50 text-muted-foreground'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{session.title}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      {filteredSessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={currentSessionId === session.id}
          onSelect={() => handleSelectSession(session.id)}
          onDelete={() => handleDeleteSession(session.id)}
        />
      ))}
    </div>
  )
}
