import { AzureOpenAI } from 'openai';

async function main() {
  const openai = new AzureOpenAI({
    endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
    apiKey: 'claude',
    apiVersion: 'claude',
    dangerouslyAllowBrowser: true,
  });

  const response = await openai.chat.completions.create({
    model: 'aws_sdk_claude37_sonnet',
    messages: [{ role: 'user', content: 'Hello, Claude' }],
    stream: true,
  });

  for await (const chunk of response) {
    console.log(chunk.choices[0]?.delta?.content || '');
  }
}

main();
