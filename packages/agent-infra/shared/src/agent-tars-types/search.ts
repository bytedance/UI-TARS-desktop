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

/**
 * Supported search providers
 */
export enum SearchProvider {
  /**
   * Browser-based search using headless browser
   */
  BrowserSearch = 'browser_search',
  /**
   * Bing Search API
   */
  BingSearch = 'bing_search',
  /**
   * Tavily Search API
   */
  Tavily = 'tavily',
  /**
   * Duckduckgo Search API
   */
  DuckduckgoSearch = 'duckduckgo_search',
  /**
   * SearXNG Search API
   */
  SearXNG = 'searxng',
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
