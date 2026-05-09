import type { Message } from './message'

export interface SessionMetadata {
  totalMessages: number
  totalTokens?: number
  lastModel?: string
  tags?: string[]
}

export interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  metadata: SessionMetadata
}

export interface SessionWithMessages extends Session {
  messages: Message[]
}

export interface CreateSessionInput {
  title?: string
}

export interface UpdateSessionInput {
  title?: string
  metadata?: Partial<SessionMetadata>
}
