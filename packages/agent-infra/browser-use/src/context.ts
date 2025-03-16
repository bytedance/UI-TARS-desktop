/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/packages/storage/lib/settings/types.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
export enum AgentNameEnum {
  Planner = 'planner',
  Navigator = 'navigator',
  Validator = 'validator',
}

// Enum for supported LLM providers
export enum LLMProviderEnum {
  AzureOpenAI = 'azure_openai',
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  endpoint?: string;
}
