'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { 
  inputValueAtom, 
  attachedImagesAtom, 
  isProcessingAtom,
  messagesAtom,
  streamingMessageAtom,
  abortControllerAtom,
  sessionsAtom,
  currentSessionIdAtom
} from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ImagePreview } from './image-preview'
import { 
  Send, 
  Square, 
  Paperclip, 
  Image as ImageIcon 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import type { Message, ContentPart } from '@/lib/types'

interface ChatInputProps {
  sessionId: string
}

export function ChatInput({ sessionId }: ChatInputProps) {
  const [inputValue, setInputValue] = useAtom(inputValueAtom)
  const [attachedImages, setAttachedImages] = useAtom(attachedImagesAtom)
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom)
  const [messages, setMessages] = useAtom(messagesAtom)
  const setStreamingMessage = useSetAtom(streamingMessageAtom)
  const [abortController, setAbortController] = useAtom(abortControllerAtom)
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [sessionId])

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          setAttachedImages((prev) => [...prev, dataUrl])
        }
        reader.readAsDataURL(file)
      }
    })
  }, [setAttachedImages])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            setAttachedImages((prev) => [...prev, dataUrl])
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [setAttachedImages])

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }, [setAttachedImages])

  const handleAbort = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsProcessing(false)
      setStreamingMessage(null)
    }
  }, [abortController, setAbortController, setIsProcessing, setStreamingMessage])

  const handleSubmit = useCallback(async () => {
    const trimmedValue = inputValue.trim()
    if (!trimmedValue && attachedImages.length === 0) return
    if (isProcessing) return

    // Build message content
    let content: string | ContentPart[] = trimmedValue
    if (attachedImages.length > 0) {
      const parts: ContentPart[] = []
      attachedImages.forEach((url) => {
        parts.push({
          type: 'image_url',
          image_url: { url, detail: 'auto' },
        })
      })
      if (trimmedValue) {
        parts.push({ type: 'text', text: trimmedValue })
      }
      content = parts
    }

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    // Add to messages
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setAttachedImages([])
    setIsProcessing(true)

    // Update session title if it's the first message
    if (messages.length === 0 && currentSessionId) {
      const title = trimmedValue.slice(0, 50) + (trimmedValue.length > 50 ? '...' : '')
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, title, updatedAt: new Date().toISOString() } : s
        )
      )
    }

    // Create abort controller
    const controller = new AbortController()
    setAbortController(controller)

    try {
      // Call the API
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }

      setStreamingMessage(assistantMessage)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            
            if (parsed.type === 'content') {
              assistantMessage = {
                ...assistantMessage,
                content: (assistantMessage.content as string) + parsed.content,
              }
              setStreamingMessage({ ...assistantMessage })
            } else if (parsed.type === 'thinking') {
              assistantMessage = {
                ...assistantMessage,
                thinking: (assistantMessage.thinking || '') + parsed.content,
              }
              setStreamingMessage({ ...assistantMessage })
            } else if (parsed.type === 'tool_call') {
              assistantMessage = {
                ...assistantMessage,
                toolCalls: [
                  ...(assistantMessage.toolCalls || []),
                  parsed.toolCall,
                ],
              }
              setStreamingMessage({ ...assistantMessage })
            } else if (parsed.type === 'tool_result') {
              assistantMessage = {
                ...assistantMessage,
                toolResults: [
                  ...(assistantMessage.toolResults || []),
                  parsed.toolResult,
                ],
              }
              setStreamingMessage({ ...assistantMessage })
            } else if (parsed.type === 'done') {
              assistantMessage = {
                ...assistantMessage,
                isStreaming: false,
                finishReason: parsed.finishReason,
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Finalize the message
      setStreamingMessage(null)
      setMessages((prev) => [...prev, { ...assistantMessage, isStreaming: false }])

      // Update session
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  metadata: {
                    ...s.metadata,
                    totalMessages: messages.length + 2,
                  },
                }
              : s
          )
        )
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sending message:', error)
        // Add error message
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: `Error: ${(error as Error).message}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsProcessing(false)
      setAbortController(null)
      setStreamingMessage(null)
    }
  }, [
    inputValue,
    attachedImages,
    isProcessing,
    messages,
    sessionId,
    currentSessionId,
    setMessages,
    setInputValue,
    setAttachedImages,
    setIsProcessing,
    setAbortController,
    setStreamingMessage,
    setSessions,
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="space-y-2">
      {/* Image previews */}
      {attachedImages.length > 0 && (
        <ImagePreview images={attachedImages} onRemove={removeImage} />
      )}

      {/* Input container with gradient border */}
      <div
        className={cn(
          'relative rounded-xl p-[1px]',
          isProcessing
            ? 'gradient-border'
            : 'bg-border hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500'
        )}
      >
        <div className="flex items-end gap-2 rounded-xl bg-card p-3">
          {/* Attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask me anything... (Ctrl+Enter to send)"
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none',
              'max-h-[200px] min-h-[40px]'
            )}
            disabled={isProcessing}
            rows={1}
          />

          {/* Send/Stop button */}
          {isProcessing ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAbort}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={!inputValue.trim() && attachedImages.length === 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hint text */}
      <p className="text-xs text-center text-muted-foreground">
        Agent TARS can browse websites, search the web, and use tools to complete tasks.
      </p>
    </div>
  )
}
