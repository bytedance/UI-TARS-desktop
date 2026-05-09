'use client'

import { useState } from 'react'
import type { Message as MessageType } from '@/lib/types'
import { getTextContent, getImageUrls, hasImages } from '@/lib/types'
import { UserMessage } from './user-message'
import { AssistantMessage } from './assistant-message'
import { SystemMessage } from './system-message'
import { ToolCalls } from './tool-calls'
import { ThinkingToggle } from './thinking-toggle'
import { MultimodalContent } from './multimodal-content'
import { cn } from '@/lib/utils'

interface MessageProps {
  message: MessageType
  isUser: boolean
  isSystem: boolean
}

export function Message({ message, isUser, isSystem }: MessageProps) {
  const [showThinking, setShowThinking] = useState(false)
  
  const textContent = getTextContent(message.content)
  const imageUrls = getImageUrls(message.content)
  const hasImageContent = hasImages(message.content)

  if (isSystem) {
    return <SystemMessage content={textContent} />
  }

  if (isUser) {
    return (
      <div className="space-y-2">
        {hasImageContent && <MultimodalContent images={imageUrls} />}
        <UserMessage content={textContent} />
      </div>
    )
  }

  // Assistant message
  return (
    <div className="space-y-3 max-w-full">
      {/* Thinking section */}
      {message.thinking && (
        <ThinkingToggle
          thinking={message.thinking}
          duration={message.thinkingDuration}
          isOpen={showThinking}
          onToggle={() => setShowThinking(!showThinking)}
        />
      )}

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <ToolCalls
          toolCalls={message.toolCalls}
          toolResults={message.toolResults}
        />
      )}

      {/* Main content */}
      {textContent && (
        <AssistantMessage
          content={textContent}
          isStreaming={message.isStreaming}
        />
      )}

      {/* Streaming indicator */}
      {message.isStreaming && !textContent && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm">Thinking...</span>
        </div>
      )}
    </div>
  )
}

export { UserMessage, AssistantMessage, SystemMessage, ToolCalls, ThinkingToggle, MultimodalContent }
