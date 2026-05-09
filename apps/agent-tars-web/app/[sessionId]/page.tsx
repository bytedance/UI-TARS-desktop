'use client'

import { useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { 
  currentSessionIdAtom, 
  sessionsAtom,
  messagesAtom,
  inputValueAtom 
} from '@/lib/store'
import { Shell } from '@/components/layout/shell'
import { ChatPanel } from '@/components/chat/chat-panel'
import { WorkspacePanel } from '@/components/workspace/workspace-panel'
import { SettingsModal } from '@/components/settings/settings-modal'
import { v4 as uuidv4 } from 'uuid'

export default function SessionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const setMessages = useSetAtom(messagesAtom)
  const setInputValue = useSetAtom(inputValueAtom)

  // Set current session on mount
  useEffect(() => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId)
      
      // Check if session exists, if not create it
      const exists = sessions.some((s) => s.id === sessionId)
      if (!exists) {
        const newSession = {
          id: sessionId,
          title: 'New Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            totalMessages: 0,
          },
        }
        setSessions([newSession, ...sessions])
      }
      
      // Clear messages for new session (would load from storage in production)
      setMessages([])
    }
  }, [sessionId, currentSessionId, sessions, setCurrentSessionId, setSessions, setMessages])

  // Handle initial prompt from URL
  useEffect(() => {
    const prompt = searchParams.get('prompt')
    if (prompt) {
      setInputValue(prompt)
      // Clear the URL param
      window.history.replaceState({}, '', `/${sessionId}`)
    }
  }, [searchParams, sessionId, setInputValue])

  return (
    <Shell workspace={<WorkspacePanel />}>
      <ChatPanel sessionId={sessionId} />
      <SettingsModal />
    </Shell>
  )
}
