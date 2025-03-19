export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
  AZURE_OPENAI = 'azure_openai',
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
}

export interface SearchSettings {
  provider: SearchProvider;
  apiKey: string;
  baseUrl?: string;
}

export interface AppSettings {
  model: ModelSettings;
  fileSystem: FileSystemSettings;
  search: SearchSettings;
}
