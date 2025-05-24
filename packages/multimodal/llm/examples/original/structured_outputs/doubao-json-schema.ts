import { OpenAI } from 'openai';

/**
 * Examples for using Doubao's response_format with JSON Schema to get structured responses.
 */

// JSON Schema definition
const jsonSchema = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description: 'The question extracted from the input text',
    },
    answer: {
      type: 'string',
      description: 'The answer extracted from the input text',
    },
    metadata: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'The academic subject of the question',
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard'],
          description: 'The estimated difficulty level of the question',
        },
      },
      required: ['subject'],
    },
  },
  required: ['question', 'answer'],
};

// Non-streaming example
async function jsonSchemaExample() {
  const client = new OpenAI({
    apiKey: process.env.ARK_API_KEY,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  });

  const systemPrompt = `
Parse the exam text provided by the user. Extract the question and answer,
and provide relevant metadata about the subject and difficulty.
`;

  const userPrompt = 'Which is the longest river in the world? The Nile River.';

  const response = await client.chat.completions.create({
    model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'exam_schema',
        strict: true,
        schema: jsonSchema,
      },
    },
    stream: false,
  });

  const result = response.choices[0].message.content;
  console.log('JSON Schema Response:', result);

  try {
    const jsonObject = JSON.parse(result || '{}');
    console.log('Parsed JSON:', jsonObject);
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

// Streaming example
async function jsonSchemaStreamingExample() {
  const client = new OpenAI({
    apiKey: process.env.ARK_API_KEY,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  });

  const systemPrompt = `
Parse the exam text provided by the user. Extract the question and answer,
and provide relevant metadata about the subject and difficulty.
`;

  const userPrompt = 'What is the speed of light? 299,792,458 meters per second.';

  const stream = await client.chat.completions.create({
    model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'exam_schema',
        strict: true,
        schema: jsonSchema,
      },
    },
    stream: true,
  });

  let jsonContent = '';
  console.log('Receiving streaming JSON Schema response:');

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    jsonContent += content;

    if (content) {
      process.stdout.write(content);
    }
  }

  console.log('\n\nComplete JSON response:');
  console.log(jsonContent);

  try {
    const jsonObject = JSON.parse(jsonContent);
    console.log('\nParsed JSON object:');
    console.log(jsonObject);
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

// Run both examples
async function main() {
  console.log('Running non-streaming example:');
  await jsonSchemaExample();

  console.log('\n---------------------------------------\n');

  console.log('Running streaming example:');
  await jsonSchemaStreamingExample();
}

main().catch(console.error);
