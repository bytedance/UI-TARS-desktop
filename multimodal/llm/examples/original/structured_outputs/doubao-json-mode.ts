import { OpenAI } from 'openai';

/**
 * An example for using OpenAI's response_format parameter with streaming to get JSON responses.
 */
async function main() {
  const openai = new OpenAI({
    apiKey: process.env.ARK_API_KEY,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
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
    // https://cloud.bytedance.net/docs/ark/docs/664afad9e16ff302cb5c0706/682bfcaebcd01f0508f0cb72?source=search&from=search_bytecloud&x-resource-account=public&x-bc-region-id=bytedance
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

main().catch(console.error);
