import { AzureOpenAI } from 'openai';

/**
 * An example of implementing function calling behavior using Claude 3.7 with structured outputs.
 * This demonstrates how to use system prompts to simulate function calls and handle the results.
 */

// Function declaration schema (similar to function definitions in other examples)
const functionCallSchema = {
  type: 'object',
  properties: {
    function_name: {
      type: 'string',
      description: 'The name of the function to call',
      enum: ['get_weather', 'get_restaurant_info', 'search_products'],
    },
    arguments: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location name, such as city name',
        },
        date: {
          type: 'string',
          description: 'Date for the weather forecast (optional)',
        },
      },
      required: ['location'],
    },
  },
  required: ['function_name', 'arguments'],
};

// Mock function implementations
function getWeather(args: { location: string; date?: string }) {
  console.log(`Getting weather for ${args.location}${args.date ? ` on ${args.date}` : ''}...`);
  return {
    location: args.location,
    date: args.date || 'today',
    temperature: '70°F (21°C)',
    condition: 'Sunny',
    precipitation: '10%',
    humidity: '45%',
    wind: '5 mph',
  };
}

function getRestaurantInfo(args: { location: string }) {
  console.log(`Getting restaurant info for ${args.location}...`);
  return {
    location: args.location,
    top_restaurants: [
      { name: 'Fine Dining', cuisine: 'French', rating: 4.8 },
      { name: 'Street Food Corner', cuisine: 'Local', rating: 4.5 },
      { name: 'Sushi Palace', cuisine: 'Japanese', rating: 4.7 },
    ],
  };
}

function searchProducts(args: { location: string; product?: string }) {
  console.log(`Searching products in ${args.location}...`);
  return {
    location: args.location,
    products: [
      { name: 'Laptop', price: '$999', store: 'Electronics Store' },
      { name: 'Smartphone', price: '$699', store: 'Mobile World' },
      { name: 'Headphones', price: '$199', store: 'Audio Shop' },
    ],
  };
}

// Function execution router
function executeFunction(functionName: string, args: any) {
  switch (functionName) {
    case 'get_weather':
      return getWeather(args);
    case 'get_restaurant_info':
      return getRestaurantInfo(args);
    case 'search_products':
      return searchProducts(args);
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

// First request - simulate function call
async function getFunctionCall(userQuery: string) {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `
You are an AI assistant that helps users by calling appropriate functions.
Based on the user's query, determine which function to call and provide the necessary arguments.

Available functions:
- get_weather: Get weather information for a location
- get_restaurant_info: Get restaurant recommendations for a location
- search_products: Search for products in a location

IMPORTANT: Your response must be a valid JSON object with the following structure:
${JSON.stringify(functionCallSchema, null, 2)}

Your entire response must be valid JSON. Do not include any text outside the JSON structure.
`;

  const response = await claude.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
    stream: false,
  });

  const result = response.choices[0].message.content;
  console.log('Function Call Response:', result);

  try {
    return JSON.parse(result || '{}');
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

// Second request - generate user-friendly response
async function generateFinalResponse(userQuery: string, functionResult: any) {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `
You are an AI assistant that provides helpful responses based on function results.
Format the information in a natural, conversational way.
`;

  const response = await claude.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
      {
        role: 'assistant',
        content: `I'll help you with that. Let me check the information for you.`,
      },
      {
        role: 'user',
        content: `Here's the information I retrieved: ${JSON.stringify(functionResult)}`,
      },
    ],
    stream: false,
    response_format: {
      type: 'json_object',
    },
  });

  return response.choices[0].message.content;
}

// Streaming version of final response
async function streamingFinalResponse(userQuery: string, functionResult: any) {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `
You are an AI assistant that provides helpful responses based on function results.
Format the information in a natural, conversational way.
`;

  const stream = await claude.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
      {
        role: 'assistant',
        content: `I'll help you with that. Let me check the information for you.`,
      },
      {
        role: 'user',
        content: `Here's the information I retrieved: ${JSON.stringify(functionResult)}`,
      },
    ],
    stream: true,
  });

  let finalResponse = '';
  console.log('Streaming final response:');

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    finalResponse += content;

    if (content) {
      process.stdout.write(content);
    }
  }

  console.log('\n');
  return finalResponse;
}

// Main execution function
async function main() {
  // Example queries to test
  const queries = [
    "What's the weather like in Seattle today?",
    'Can you recommend some restaurants in New York?',
    "I'm looking for electronic products in San Francisco",
  ];

  for (const query of queries) {
    console.log(`\n======= Processing query: "${query}" =======\n`);

    // Step 1: Get function call information
    console.log('Step 1: Determining function to call...');
    const functionCall = await getFunctionCall(query);

    if (!functionCall) {
      console.log('Failed to determine function call.');
      continue;
    }

    console.log(`Function to call: ${functionCall.function_name}`);
    console.log(`Arguments: ${JSON.stringify(functionCall.arguments)}`);

    // Step 2: Execute the function
    console.log('\nStep 2: Executing function...');
    const functionResult = executeFunction(functionCall.function_name, functionCall.arguments);
    console.log(`Function result: ${JSON.stringify(functionResult)}`);

    // Step 3: Generate final response
    console.log('\nStep 3: Generating final response...');
    const finalResponse = await generateFinalResponse(query, functionResult);
    console.log(`Final response: ${finalResponse}`);

    // Step 4: Demonstrate streaming response (only for the first query)
    if (query === queries[0]) {
      console.log('\nStep 4: Demonstrating streaming response...');
      await streamingFinalResponse(query, functionResult);
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { getFunctionCall, executeFunction, generateFinalResponse, streamingFinalResponse };
