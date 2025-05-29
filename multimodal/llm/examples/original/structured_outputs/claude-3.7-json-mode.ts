import { AzureOpenAI } from 'openai';

/**
 * Example for using Claude 3.7 to generate structured JSON responses.
 * This demonstrates how to use system prompts to get JSON formatted output.
 */

// Non-streaming example
async function jsonModeExample() {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `
You are a helpful assistant that responds in JSON format.
The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format.

IMPORTANT: Your entire response must be valid JSON with the following structure:
{
    "question": "The extracted question",
    "answer": "The extracted answer"
}

Do not include any text outside of the JSON structure.
`;

  const userPrompt = 'Which is the longest river in the world? The Nile River.';

  const response = await claude.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
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
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `
You are a helpful assistant that responds in JSON format.
The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format.

IMPORTANT: Your entire response must be valid JSON with the following structure:
{
    "question": "The extracted question",
    "answer": "The extracted answer"
}

Do not include any text outside of the JSON structure.
`;

  const userPrompt = 'What is the speed of light? 299,792,458 meters per second.';

  const stream = await claude.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
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
    stream: true,
    response_format: {
      type: 'json_object',
    },
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
