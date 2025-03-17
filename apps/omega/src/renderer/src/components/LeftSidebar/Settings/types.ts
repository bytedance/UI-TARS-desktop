export enum Provider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
  AZURE_OPENAI = 'azure_openai',
}

export interface ModelSettings {
  provider: Provider;
  model: string;
  apiKey: string;
  apiVersion?: string;
  endpoint?: string;
  customModel?: string;
}

export interface FileSystemSettings {
  availableDirectories: string[];
}

export interface AppSettings {
  model: ModelSettings;
  fileSystem: FileSystemSettings;
}
