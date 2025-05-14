import { OpenAI } from 'openai';
import fs from 'fs';

/**
 * An example for generate image.
 *
 * @see https://platform.openai.com/docs/models/gpt-image-1
 * @see https://platform.openai.com/docs/guides/image-generation
 */
async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
`,
  });

  // Save the image to a file
  const image_base64 = response.data[0].b64_json;
  const image_bytes = Buffer.from(image_base64, 'base64');
  fs.writeFileSync('otter.png', image_bytes);
}

main();
