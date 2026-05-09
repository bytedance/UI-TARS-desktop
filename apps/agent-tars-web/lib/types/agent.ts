export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface AgentConfig {
  apiBaseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  enableThinking: boolean
  systemPrompt?: string
}

export interface BrowserConfig {
  headless: boolean
  viewport: {
    width: number
    height: number
  }
  timeout: number
}

export interface ToolDefinition {
  name: string
  description: string
  category: 'browser' | 'search' | 'file' | 'terminal' | 'other'
  inputSchema: Record<string, unknown>
}

export interface AgentState {
  isProcessing: boolean
  currentToolCall?: string
  connectionStatus: ConnectionStatus
  abortController?: AbortController
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  enableThinking: true,
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: true,
  viewport: {
    width: 1280,
    height: 720,
  },
  timeout: 30000,
}
