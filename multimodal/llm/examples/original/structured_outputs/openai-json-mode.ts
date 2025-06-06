import { OpenAI } from 'openai';

/**
 * Examples for using OpenAI's response_format parameter to get JSON responses.
 */

// Non-streaming example
async function jsonModeExample() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `
The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format. 

EXAMPLE INPUT: 
Which is the highest mountain in the world? Mount Everest.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain in the world?",
    "answer": "Mount Everest"
}
`;

  const userPrompt = 'Which is the longest river in the world? The Nile River.';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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
      type: 'json_object',
    },
    stream: false,
  });

  const result = response.choices[0].message.content;
  console.log('JSON Response:', result);

  try {
    const jsonObject = JSON.parse(result || '{}');
    console.log('Parsed JSON:', jsonObject);
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

// Streaming example
async function jsonModeStreamingExample() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `
The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format. 

EXAMPLE INPUT: 
Which is the highest mountain in the world? Mount Everest.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain in the world?",
    "answer": "Mount Everest"
}
`;

  const userPrompt = 'Which is the longest river in the world? The Nile River.';

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
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
      type: 'json_object',
    },
    stream: true,
  });

  let jsonContent = '';

  console.log('Receiving streaming JSON response:');

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
  await jsonModeExample();

  console.log('\n---------------------------------------\n');

  console.log('Running streaming example:');
  await jsonModeStreamingExample();
}

main().catch(console.error);
