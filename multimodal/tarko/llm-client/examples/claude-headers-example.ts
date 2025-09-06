/**
 * Example demonstrating automatic Claude header configuration
 */

import { TokenJS, HeaderConfigRegistry, ClaudeModelDetector } from '../src/index.js';

// Basic usage - headers are automatically added
async function basicExample() {
  const client = new TokenJS({
    apiKey: 'your-anthropic-api-key',
  });

  // This will automatically include anthropic-beta headers for Claude models
  const response = await client.chat.completions.create({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you?',
      },
    ],
  });

  console.log('Response with auto headers:', response);
}

// Custom headers example
async function customHeadersExample() {
  const client = new TokenJS({
    apiKey: 'your-anthropic-api-key',
    headers: {
      'X-Custom-Header': 'my-value',
    },
  });

  // Custom headers will be merged with automatic headers
  const response = await client.chat.completions.create({
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    messages: [
      {
        role: 'user',
        content: 'Tell me about TypeScript',
      },
    ],
  });

  console.log('Response with custom + auto headers:', response);
}

// Disable automatic headers
async function disableAutoHeadersExample() {
  const client = new TokenJS({
    apiKey: 'your-anthropic-api-key',
    autoHeaders: false, // Disable automatic headers
  });

  // No automatic headers will be added
  const response = await client.chat.completions.create({
    provider: 'anthropic',
    model: 'claude-3-haiku',
    messages: [
      {
        role: 'user',
        content: 'What is machine learning?',
      },
    ],
  });

  console.log('Response without auto headers:', response);
}

// Tool usage example - conditional headers
async function toolUsageExample() {
  const client = new TokenJS({
    apiKey: 'your-anthropic-api-key',
  });

  // When using tools, additional headers may be automatically added
  const response = await client.chat.completions.create({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'user',
        content: 'What is the weather like?',
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get current weather information',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state',
              },
            },
            required: ['location'],
          },
        },
      },
    ],
  });

  console.log('Response with tool headers:', response);
}

// Advanced: Custom provider configuration
function customProviderConfigExample() {
  // Register custom header configuration for a provider
  HeaderConfigRegistry.register('openai', {
    static: {
      'X-Custom-Provider': 'openai',
    },
    dynamic: (model) => ({
      'X-Model-Name': model,
    }),
    conditional: (params) => {
      if (params.temperature && params.temperature > 0.8) {
        return { 'X-High-Temperature': 'true' };
      }
      return {};
    },
  });

  console.log('Custom provider configuration registered');
}

// Utility functions
function demonstrateUtilities() {
  // Check if a model is a Claude model
  console.log('Is claude-3-sonnet a Claude model?', ClaudeModelDetector.isClaudeModel('claude-3-sonnet'));
  console.log('Is gpt-4 a Claude model?', ClaudeModelDetector.isClaudeModel('gpt-4'));

  // Get Claude beta features
  console.log('Claude beta features:', ClaudeModelDetector.getClaudeBetaFeatures());

  // Generate headers for a specific provider
  const headers = HeaderConfigRegistry.generateHeaders(
    'anthropic',
    'claude-3-5-sonnet-20241022',
    { tools: [] }
  );
  console.log('Generated headers:', headers);
}

// Run examples
async function runExamples() {
  try {
    console.log('=== Basic Example ===');
    await basicExample();

    console.log('\n=== Custom Headers Example ===');
    await customHeadersExample();

    console.log('\n=== Disable Auto Headers Example ===');
    await disableAutoHeadersExample();

    console.log('\n=== Tool Usage Example ===');
    await toolUsageExample();

    console.log('\n=== Custom Provider Config Example ===');
    customProviderConfigExample();

    console.log('\n=== Utility Functions Demo ===');
    demonstrateUtilities();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();

export {
  basicExample,
  customHeadersExample,
  disableAutoHeadersExample,
  toolUsageExample,
  customProviderConfigExample,
  demonstrateUtilities,
};
