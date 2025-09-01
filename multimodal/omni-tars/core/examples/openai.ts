import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';
import { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { SYSTEM_PROMPT_GROUP } from '../src/environments/prompt_t5';
import { SYSTEM_PROMPT } from '../src/environments/prompt';

interface RequestOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  [key: string]: unknown;
}

const openAI = new OpenAI({
  apiKey: process.env.OMNI_TARS_API_KEY,
  baseURL: process.env.OMNI_TARS_BASE_URL,
});

/**
 * Request Gemini model via Azure OpenAI
 * @param prompt - The user prompt
 * @param options - Optional parameters
 * @returns Model response
 */
async function requestModel(prompt: string, options: RequestOptions = {}): Promise<ChatCompletion> {
  try {
    const messages = [
      ...SYSTEM_PROMPT_GROUP.map((sp) => {
        return {
          role: 'system',
          content: sp,
        };
      }),
      {
        role: 'user',
        content: prompt,
      },
    ] as Array<ChatCompletionMessageParam>;

    // await logContent(JSON.stringify(messages, null, 2), 'message.txt');

    //@ts-ignore
    const response = await openAI.chat.completions.create({
      model: 'ep-20250830114613-nvhqh', //T5
      //   model: 'ep-20250813205932-v7bmd',
      messages,
      max_tokens: options.maxTokens || 32768,
      temperature: options.temperature || 1,
      top_p: options.topP || 0.9,
      ...options,
      stream: false,
      thinking: { type: 'disabled' },
    });

    return response;
  } catch (error) {
    console.error('Error requesting model:', error);
    throw new Error(`model request failed: ${(error as Error).message}`);
  }
}

// Example usage
export async function run(prompt: string): Promise<void> {
  try {
    // Simple request
    const response = await requestModel(prompt);

    console.log('resp: ', JSON.stringify(response, null, 2));

    // await logContent(response.choices[0]?.message.content, 'seed.txt');
  } catch (error) {
    console.error('Main execution error:', error);
  }
}

async function logContent(content: string | null, path: string) {
  const baseDir = `./logs`;

  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  await writeFile(`${baseDir}/${path}`, content || '', {
    encoding: 'utf-8',
  });
  console.log('write finished.');
}

run('write quick sort in python');
// run('hi');
