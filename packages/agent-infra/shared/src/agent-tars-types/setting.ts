import { type MCPServer } from '@agent-infra/mcp-shared/client';
import { SearchSettings } from './search';

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
