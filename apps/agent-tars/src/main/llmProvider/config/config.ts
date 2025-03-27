import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * LLM Provider types
 */
export enum ProviderType {
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  DEEPSEEK = 'deepseek',
}

/**
 * Configuration interface for each provider
 */
export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  apiVersion?: string;
  models: {
    [key: string]: string;
  };
  defaultModel: string;
}
