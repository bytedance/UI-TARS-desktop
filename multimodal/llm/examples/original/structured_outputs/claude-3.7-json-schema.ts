import { AzureOpenAI } from 'openai';
import { z } from 'zod'; // Using zod for type validation

/**
 * Example for using Claude 3.7 with system prompts to generate responses conforming to a JSON schema.
 * Since Claude doesn't have native JSON Schema support like OpenAI, we use system prompts to achieve this.
 */

async function main() {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  // Zod schema for runtime validation (same as in the OpenAI example)
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

  // JSON Schema representation (for the system prompt)
  const jsonSchema = {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            explanation: {
              type: 'string',
              description: 'Explanation of this step in natural language',
            },
            formula: {
              type: 'string',
              description: 'Mathematical formula or equation for this step',
            },
          },
          required: ['explanation', 'formula'],
        },
      },
      final_answer: {
        type: 'string',
        description: 'The final answer to the problem',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Optional confidence score between 0 and 1',
      },
    },
    required: ['steps', 'final_answer'],
  };

  const systemPrompt = `
You are a helpful math tutor. Solve the mathematical problem step by step.

IMPORTANT: Your response must be a valid JSON object that strictly conforms to this schema:
${JSON.stringify(jsonSchema, null, 2)}

Your entire response must be valid JSON. Do not include any text outside the JSON structure.
`;

  const userPrompt = 'Solve the equation: 2x + 3 = 11';

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
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'exam_schema',
        strict: true,
        schema: jsonSchema,
      },
    },
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
 * Example for using Claude 3.7 with system prompts to generate schema-conforming responses in streaming mode.
 */
async function streamExample() {
  const claude = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
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

  // JSON Schema representation (for the system prompt)
  const jsonSchema = {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            explanation: {
              type: 'string',
              description: 'Explanation of this step in natural language',
            },
            formula: {
              type: 'string',
              description: 'Mathematical formula or equation for this step',
            },
          },
          required: ['explanation', 'formula'],
        },
      },
      final_answer: {
        type: 'string',
        description: 'The final answer to the problem',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Optional confidence score between 0 and 1',
      },
    },
    required: ['steps', 'final_answer'],
  };

  const systemPrompt = `
You are a helpful math tutor. Solve the mathematical problem step by step.

IMPORTANT: Your response must be a valid JSON object that strictly conforms to this schema:
${JSON.stringify(jsonSchema, null, 2)}

Your entire response must be valid JSON. Do not include any text outside the JSON structure.
`;

  const userPrompt = 'Solve the equation: 3x - 7 = 14';

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
