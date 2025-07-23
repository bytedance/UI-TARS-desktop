import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

async function main() {
  const tools = [
    {
      type: 'function',
      name: 'get_current_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location', 'unit'],
      },
    },
  ];

  const response = await openai.responses.create({
    model: 'ep-20250613182556-7z8pl',
    //@ts-ignore
    tools: tools,
    input: 'What is the weather like in Boston today?',
  });

  console.log(response);
}

main();
