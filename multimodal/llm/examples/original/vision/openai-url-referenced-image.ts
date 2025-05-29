import { OpenAI } from 'openai';

/**
 * An example for recognizing text in an image.
 *
 * @see https://github.com/openai/openai-node
 */
async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract key information from this image at markdown',
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
            },
          },
        ],
      },
    ],
    stream: true,
  });

  for await (const chunk of response) {
    console.log(JSON.stringify(chunk));
  }
}

main();
