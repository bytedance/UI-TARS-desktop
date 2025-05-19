import { GoogleGenAI } from '@google/genai';

/**
 * @see https://ai.google.dev/gemini-api/docs?hl=zh-cn#javascript
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models
 * @see https://ai.google.dev/gemini-api/docs/vision?hl=zh-cn&lang=node
 */

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageResp = await fetch(
    'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
  ).then((response) => response.arrayBuffer());

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: [
      {
        text: 'Extract key information from this image at markdown',
      },
      {
        inlineData: {
          data: Buffer.from(imageResp).toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ],
  });

  for await (const chunk of stream) {
    console.log(JSON.stringify(chunk));
  }
}

main();
