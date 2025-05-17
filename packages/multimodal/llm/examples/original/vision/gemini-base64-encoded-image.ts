import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @see https://ai.google.dev/gemini-api/docs?hl=zh-cn#javascript
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models
 * @see https://ai.google.dev/gemini-api/docs/vision?hl=zh-cn&lang=node
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'models/gemini-2.0-flash',
  // GoogleGenerativeAIFetchError: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:streamGenerateContent?alt=sse: [429 Too Many Requests]
  // model: 'models/gemini-2.5-pro-preview-03-25',
});

async function main() {
  const imageResp = await fetch(
    'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
  ).then((response) => response.arrayBuffer());

  const result = await model.generateContentStream([
    {
      text: 'Extract key information from this image at markdown',
    },
    {
      inlineData: {
        data: Buffer.from(imageResp).toString('base64'),
        mimeType: 'image/jpeg',
      },
    },
  ]);

  for await (const chunk of result.stream) {
    console.log(JSON.stringify(chunk));
  }
}

main();
