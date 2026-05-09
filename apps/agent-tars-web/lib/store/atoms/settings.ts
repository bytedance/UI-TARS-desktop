import { atomWithStorage } from 'jotai/utils'
import { DEFAULT_AGENT_CONFIG, DEFAULT_BROWSER_CONFIG, type AgentConfig, type BrowserConfig } from '@/lib/types'

// Agent/VLM settings
export const agentConfigAtom = atomWithStorage<AgentConfig>(
  'agent-tars-agent-config',
  DEFAULT_AGENT_CONFIG
)

// Browser automation settings
export const browserConfigAtom = atomWithStorage<BrowserConfig>(
  'agent-tars-browser-config',
  DEFAULT_BROWSER_CONFIG
)
