'use client'

import { Message as MessageComponent } from './message'
import type { MessageGroup as MessageGroupType } from '@/lib/types'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageGroupProps {
  group: MessageGroupType
}

export function MessageGroup({ group }: MessageGroupProps) {
  const isUser = group.role === 'user'
  const isSystem = group.role === 'system'

  return (
    <div className={cn('flex gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {!isSystem && (
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      )}

      {/* Messages */}
      <div
        className={cn(
          'flex flex-col gap-2 min-w-0 flex-1',
          isUser ? 'items-end' : 'items-start',
          isSystem ? 'items-center' : ''
        )}
      >
        {group.messages.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            isUser={isUser}
            isSystem={isSystem}
          />
        ))}
      </div>
    </div>
  )
}
