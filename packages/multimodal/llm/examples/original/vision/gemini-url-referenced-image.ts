import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

/**
 * @see https://ai.google.dev/gemini-api/docs?hl=zh-cn#javascript
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models (Deprecated)
 * @see https://ai.google.dev/gemini-api/docs/models
 * @see https://ai.google.dev/gemini-api/docs/vision?hl=zh-cn&lang=node
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versioning?hl=zh-cn#gemini-model-versions
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'models/gemini-2.5-pro-preview-03-25',
});

async function main() {
  const imageResp = await fetch(
    'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
  ).then((response) => response.arrayBuffer());

  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
  const uploadResult = await fileManager.uploadFile(
    Buffer.from(imageResp),
    // This API does not support online url.
    // Error: ENOENT: no such file or directory, open 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png'
    // 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
    {
      mimeType: 'image/png',
      displayName: 'simple-image',
    },
  );

  const result = await model.generateContentStream([
    {
      text: 'Extract key information from this image at markdown',
    },
    /**
     * GoogleGenerativeAIFetchError: [GoogleGenerativeAI Error]: Error fetching from
     * https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?alt=sse:
     * [400 Bad Request] Invalid or unsupported file uri: https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png
     * @see https://ai.google.dev/gemini-api/docs/vision?hl=zh-cn&lang=node#upload-image
     */
    // {
    //   fileData: {
    //     fileUri:
    //       'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
    //     mimeType: 'image/png',
    //   },
    // },
    {
      fileData: {
        fileUri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType,
      },
    },
  ]);

  for await (const chunk of result.stream) {
    console.log(JSON.stringify(chunk));
  }
}

main();
