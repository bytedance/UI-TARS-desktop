/**
 * Example usage of the unified LLM provider interface
 *
 * This file demonstrates how to use the LLM provider interface
 * with different models from different providers.
 */

// import { Message } from '@agent-infra/shared';
// import { LLM, createLLM, LLMConfig } from './index';

// async function main() {
//   // Example 1: Using the default singleton LLM instance
//   console.log('Example 1: Using the default LLM instance');
//   const response1 = await llm.askLLMText({
//     messages: [Message.userMessage('Hello, how are you?')],
//     requestId: 'example1',
//   });
//   console.log('Response:', response1);
//   // Example 2: Creating a custom LLM instance with a specific model
//   console.log('\nExample 2: Using Claude from Anthropic');
//   const claudeConfig: LLMConfig = {
//     model: 'claude-3-7-sonnet-latest',
//     temperature: 0.7,
//   };
//   const claudeLLM = createLLM(claudeConfig);
//   const response2 = await claudeLLM.askLLMText({
//     messages: [Message.userMessage('Tell me about Claude')],
//     requestId: 'example2',
//   });
//   console.log('Response:', response2);
//   // Example 3: Creating a custom LLM instance with a specific provider
//   console.log('\nExample 3: Using Azure OpenAI from Azure');
//   const awsConfig: LLMConfig = {
//     model: 'aws_claude35_sdk_sonnet_v2',
//     temperature: 0.5,
//   };
//   const awsLLM = createLLM(awsConfig);
//   const response3 = await awsLLM.askLLMText({
//     messages: [Message.userMessage('Tell me about claude')],
//     requestId: 'example3',
//   });
//   console.log('Response:', response3);
//   // Example 4: Switching models/providers at runtime
//   console.log('\nExample 4: Switching providers at runtime');
//   const dynamicLLM = createLLM({ model: 'gpt-4o-mini' });
//   const response4a = await dynamicLLM.askLLMText({
//     messages: [Message.userMessage('What model are you using?')],
//     requestId: 'example4a',
//   });
//   console.log('Response with GPT-4o:', response4a);
//   dynamicLLM.setProvider({ model: 'gemini-2.0-flash' });
//   const response4b = await dynamicLLM.askTool({
//     messages: [Message.userMessage('What model are you using now?')],
//     requestId: 'example4b',
//     tools: [
//       {
//         type: 'function',
//         function: {
//           name: 'get_model_name',
//           description: 'Get the name of the current model',
//           parameters: {
//             type: 'object',
//             properties: {
//               model: {
//                 type: 'string',
//                 description: 'The name of the model',
//               },
//             },
//           },
//         },
//       },
//     ],
//   });
//   console.log('Response with model:', JSON.stringify(response4b, null, 2));
//   // Switch to Mistral
//   dynamicLLM.setProvider({ model: 'mistral-large-latest' });
//   const response4c = await dynamicLLM.askLLMText({
//     messages: [Message.userMessage('What model are you using now?')],
//     requestId: 'example4b',
//   });
//   console.log('Response with Mistral:', response4c);
//   // Example 5: Getting available providers and models
//   console.log('\nExample 5: Available providers and models');
//   console.log('Available providers:', LLM.getAvailableProviders());
// }

// // Run the example - uncomment to execute
// main().catch(console.error);
