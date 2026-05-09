'use client'

import { useRef, useEffect } from 'react'
import { useAtomValue, useAtom } from 'jotai'
import { messageGroupsAtom, streamingMessageAtom, autoScrollAtom } from '@/lib/store'
import { MessageGroup } from './message-group'
import { ChatInput } from './input/chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles } from 'lucide-react'

interface ChatPanelProps {
  sessionId: string
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const messageGroups = useAtomValue(messageGroupsAtom)
  const streamingMessage = useAtomValue(streamingMessageAtom)
  const [autoScroll] = useAtom(autoScrollAtom)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messageGroups, streamingMessage, autoScroll])

  const isEmpty = messageGroups.length === 0 && !streamingMessage

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mb-4">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Start a conversation
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Ask me to browse websites, search the web, execute commands, or complete any task.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-6 max-w-4xl mx-auto">
            {messageGroups.map((group) => (
              <MessageGroup key={group.id} group={group} />
            ))}
            
            {/* Streaming message */}
            {streamingMessage && (
              <MessageGroup
                group={{
                  id: 'streaming',
                  role: streamingMessage.role,
                  messages: [streamingMessage],
                  timestamp: streamingMessage.timestamp,
                }}
              />
            )}
            
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      <div className="p-4 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto">
          <ChatInput sessionId={sessionId} />
        </div>
      </div>
    </div>
  )
}
