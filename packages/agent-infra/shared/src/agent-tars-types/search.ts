import { type MCPServer } from '@agent-infra/mcp-shared/client';

export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
  AZURE_OPENAI = 'azure_openai',
  DEEPSEEK = 'deepseek',
}

export interface ModelSettings {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  apiVersion?: string;
  endpoint?: string;
}

export interface FileSystemSettings {
  availableDirectories: string[];
}

export enum SearchProvider {
  BING_SEARCH = 'bing_search',
  TAVILY = 'tavily',
  DUCKDUCKGO_SEARCH = 'duckduckgo_search',
  BROWSER_SEARCH = 'browser_search',
  SEARXNG = 'searxng',
}

export interface SearchSettings {
  provider: SearchProvider;
  apiKey: string;
  baseUrl?: string;
  defaultEngine?: 'bing';
}

export type MCPServerSetting = MCPServer & {
  id: string;
};

export interface MCPSettings {
  mcpServers: MCPServerSetting[];
}

export interface AppSettings {
  model: ModelSettings;
  fileSystem: FileSystemSettings;
  search: SearchSettings;
  mcp: MCPSettings;
}
