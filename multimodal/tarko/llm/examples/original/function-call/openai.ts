import { OpenAI } from 'openai';
import {
  ChatCompletionTool,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources';

/**
 * An example for function call with openai.
 *
 * @see https://platform.openai.com/docs/guides/function-calling?api-mode=chat
 */
async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current temperature for a given location.',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City and country e.g. Bogotá, Colombia',
            },
          },
          required: ['location'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  ];

  function getWeather(args: { location: string }) {
    return {
      location: args.location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  }

  const messages: Array<ChatCompletionMessageParam> = [
    { role: 'user', content: 'What is the weather like in Paris today?' },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    tools,
  });

  let toolCall: ChatCompletionMessageToolCall | undefined;
  let result: ReturnType<typeof getWeather> | undefined;

  console.log(JSON.stringify(completion, null, 2));

  if (completion.choices[0].message.tool_calls) {
    toolCall = completion.choices[0].message.tool_calls[0];
    console.log(`Function to call: ${toolCall.function.name}`);
    console.log(`Arguments: ${JSON.stringify(toolCall.function.arguments)}`);

    result = getWeather(JSON.parse(toolCall.function.arguments));
    console.log(`Function execution result: ${JSON.stringify(result)}`);
  }

  /**
   * Next loop
   */
  if (result && toolCall) {
    messages.push(completion.choices[0].message); // append model's function call message
    messages.push({
      // append result message
      role: 'tool',
      tool_call_id: toolCall.id,
      // openai using `.toString()`, it would cause '[object Object]'
      content: JSON.stringify(result),
    });

    const nextCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
    });

    console.log(JSON.stringify(nextCompletion, null, 2));
    console.log(`Final Response: ${nextCompletion.choices[0].message.content}`);
  }
}

main();
