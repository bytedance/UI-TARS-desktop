import { OpenAI } from 'openai';
import { z } from 'zod'; // Using zod for type validation
import { zodResponseFormat } from 'openai/helpers/zod';
/**
 * An example for using OpenAI's response_format with JSON Schema to get structured responses.
 */
async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Zod schema for runtime validation
  const MathSolutionSchema = z.object({
    steps: z.array(
      z.object({
        explanation: z.string(),
        formula: z.string(),
      }),
    ),
    final_answer: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  });

  const systemPrompt = `
You are a helpful math tutor. Solve the mathematical problem step by step.
`;

  const userPrompt = 'Solve the equation: 2x + 3 = 11';

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
    response_format: zodResponseFormat(MathSolutionSchema, 'steps'),
    stream: false,
  });

  const result = response.choices[0].message.content;
  console.log('JSON Schema Response:', result);

  try {
    const jsonObject = JSON.parse(result || '{}');
    console.log('Parsed JSON:', jsonObject);

    // Validate the response against our Zod schema
    const validatedData = MathSolutionSchema.parse(jsonObject);
    console.log('Validated data:', validatedData);
  } catch (error) {
    console.error('Error parsing or validating JSON:', error);
  }
}

/**
 * An example for using OpenAI's response_format with JSON Schema in streaming mode.
 */
async function streamExample() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Zod schema for runtime validation
  const MathSolutionSchema = z.object({
    steps: z.array(
      z.object({
        explanation: z.string(),
        formula: z.string(),
      }),
    ),
    final_answer: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  });

  const systemPrompt = `
You are a helpful math tutor. Solve the mathematical problem step by step.
`;

  const userPrompt = 'Solve the equation: 3x - 7 = 14';

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
    response_format: zodResponseFormat(MathSolutionSchema, 'steps'),
    stream: true,
  });

  console.log('Streaming response chunks:');

  // Accumulate the JSON string chunks
  let accumulatedJSON = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    accumulatedJSON += content;
    console.log(`Chunk received: ${content}`);
  }

  console.log('\nFinal accumulated JSON:', accumulatedJSON);

  try {
    const jsonObject = JSON.parse(accumulatedJSON);
    console.log('Parsed JSON:', jsonObject);

    // Validate the response against our Zod schema
    const validatedData = MathSolutionSchema.parse(jsonObject);
    console.log('Validated data:', validatedData);
  } catch (error) {
    console.error('Error parsing or validating JSON:', error);
  }
}

// Run both examples
async function runExamples() {
  console.log('Running non-streaming example:');
  await main();

  console.log('\n---------------------------------------\n');

  console.log('Running streaming example:');
  await streamExample();
}

runExamples().catch(console.error);
