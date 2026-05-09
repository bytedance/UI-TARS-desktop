export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string
    detail?: 'auto' | 'low' | 'high'
  }
}

export interface TextContent {
  type: 'text'
  text: string
}

export type ContentPart = TextContent | ImageContent

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolResult {
  toolCallId: string
  toolName: string
  result: unknown
  isError?: boolean
  duration?: number
}

export interface Message {
  id: string
  role: MessageRole
  content: string | ContentPart[]
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  thinking?: string
  thinkingDuration?: number
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null
  isStreaming?: boolean
  model?: string
}

export interface MessageGroup {
  id: string
  role: MessageRole
  messages: Message[]
  timestamp: number
}

export function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') {
    return content
  }
  return content
    .filter((part): part is TextContent => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

export function getImageUrls(content: string | ContentPart[]): string[] {
  if (typeof content === 'string') {
    return []
  }
  return content
    .filter((part): part is ImageContent => part.type === 'image_url')
    .map((part) => part.image_url.url)
}

export function hasImages(content: string | ContentPart[]): boolean {
  return getImageUrls(content).length > 0
}
