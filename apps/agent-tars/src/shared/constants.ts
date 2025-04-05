import {
  AppSettings,
  FileSystemSettings,
  ModelSettings,
  ModelProvider,
  SearchSettings,
  MCPSettings,
  SearchProvider,
} from '@agent-infra/shared';

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: ModelProvider.ANTHROPIC,
  model: 'claude-3-7-sonnet-latest',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
};

export const DEFAULT_FILESYSTEM_SETTINGS: FileSystemSettings = {
  availableDirectories: [],
};

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  provider: SearchProvider.BrowserSearch,
  providerConfig: {
    count: 10,
    engine: 'google',
    needVisitedUrls: false,
  },
  apiKey: '',
};

export const DEFAULT_MCP_SETTINGS: MCPSettings = {
  mcpServers: [],
};

export const DEFAULT_SETTINGS: AppSettings = {
  model: DEFAULT_MODEL_SETTINGS,
  fileSystem: DEFAULT_FILESYSTEM_SETTINGS,
  search: DEFAULT_SEARCH_SETTINGS,
  mcp: DEFAULT_MCP_SETTINGS,
};
