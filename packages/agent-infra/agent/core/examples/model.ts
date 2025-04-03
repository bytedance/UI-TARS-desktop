import {
  Model,
  OpenAI,
  AzureOpenAI,
  OpenAIToolCallProvider,
  InstructionToolCallProvider,
} from '../src';

export type ModelName = 'gpt-4o-2024-11-20' | 'aws_sdk_claude37_sonnet';

export function getModel(name: ModelName) {
  if (name === 'gpt-4o-2024-11-20') {
    const apiKey = 'openai';
    const openai = new OpenAI({
      baseURL: process.env.OPENAI_API_BASE_URL,
      apiKey,
      defaultHeaders: {
        'api-key': apiKey,
      },
    });
    return new Model(openai, 'gpt-4o-2024-11-20');
  }

  if (name === 'aws_sdk_claude37_sonnet') {
    const openai = new AzureOpenAI({
      endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
      apiKey: 'claude',
      apiVersion: 'claude',
      dangerouslyAllowBrowser: true,
    });
    return new Model(openai, 'aws_sdk_claude37_sonnet');
  }

  throw new Error(`Unknown model name: ${name}`);
}

// Helper function to get appropriate tool call provider for a model
export function getToolCallProvider(model: Model) {
  if (model.name.toLowerCase().includes('claude')) {
    return new InstructionToolCallProvider();
  }

  // Default to OpenAI provider
  return new OpenAIToolCallProvider();
}
