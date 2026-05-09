import { atom } from 'jotai'
import type { Message, MessageGroup } from '@/lib/types'

// Messages for current session
export const messagesAtom = atom<Message[]>([])

// Grouped messages by consecutive role
export const messageGroupsAtom = atom((get) => {
  const messages = get(messagesAtom)
  const groups: MessageGroup[] = []
  
  for (const message of messages) {
    const lastGroup = groups[groups.length - 1]
    
    if (lastGroup && lastGroup.role === message.role) {
      lastGroup.messages.push(message)
    } else {
      groups.push({
        id: message.id,
        role: message.role,
        messages: [message],
        timestamp: message.timestamp,
      })
    }
  }
  
  return groups
})

// Currently streaming message
export const streamingMessageAtom = atom<Message | null>(null)

// Input value for chat
export const inputValueAtom = atom('')

// Attached images
export const attachedImagesAtom = atom<string[]>([])

// Is the agent currently processing
export const isProcessingAtom = atom(false)

// Current tool being executed
export const currentToolCallAtom = atom<string | null>(null)

// Abort controller for canceling requests
export const abortControllerAtom = atom<AbortController | null>(null)

// Show thinking for messages
export const showThinkingAtom = atom<Record<string, boolean>>({})

// Toggle thinking visibility for a message
export const toggleThinkingAtom = atom(
  null,
  (get, set, messageId: string) => {
    const current = get(showThinkingAtom)
    set(showThinkingAtom, {
      ...current,
      [messageId]: !current[messageId],
    })
  }
)
