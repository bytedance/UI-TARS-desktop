export type WorkspaceContentType = 
  | 'browser'
  | 'search'
  | 'file'
  | 'terminal'
  | 'image'
  | 'embed'
  | 'diff'
  | 'link'
  | 'empty'

export interface WorkspaceNavItem {
  id: string
  type: WorkspaceContentType
  title: string
  icon?: string
  timestamp: number
  toolCallId?: string
}

export interface BrowserContent {
  type: 'browser'
  url: string
  screenshot?: string
  title?: string
  elements?: BrowserElement[]
}

export interface BrowserElement {
  index: number
  tag: string
  text: string
  attributes: Record<string, string>
  rect?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface SearchContent {
  type: 'search'
  query: string
  results: SearchResult[]
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  favicon?: string
}

export interface FileContent {
  type: 'file'
  path: string
  content: string
  language?: string
}

export interface TerminalContent {
  type: 'terminal'
  command: string
  output: string
  exitCode?: number
}

export interface ImageContent {
  type: 'image'
  images: {
    url: string
    alt?: string
    width?: number
    height?: number
  }[]
}

export interface EmbedContent {
  type: 'embed'
  url: string
  title?: string
}

export interface DiffContent {
  type: 'diff'
  original: string
  modified: string
  language?: string
}

export interface LinkContent {
  type: 'link'
  url: string
  title?: string
  description?: string
  image?: string
}

export type WorkspaceContent = 
  | BrowserContent
  | SearchContent
  | FileContent
  | TerminalContent
  | ImageContent
  | EmbedContent
  | DiffContent
  | LinkContent
  | { type: 'empty' }
