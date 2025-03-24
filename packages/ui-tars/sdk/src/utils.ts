/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Jimp } from 'jimp';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { IMAGE_PLACEHOLDER, MAX_IMAGE_LENGTH } from '@ui-tars/shared/constants';
import { Conversation, Message } from '@ui-tars/shared/types';
import { DEFAULT_FACTORS, type Factors } from './constants';

/**
 * Parse box string to screen coordinates
 *
 *   e.g. '[0.131,0.25,0.131,0.25]' 2560x1440 -> { x: 335.36, y: 360 }
 *
 * @param boxStr box string
 * @param screenWidth screen width
 * @param screenHeight screen height
 * @param factors scaling factor, the training space of the target model.
 * @returns screen coordinates
 */
export const parseBoxToScreenCoords = ({
  boxStr,
  screenWidth,
  screenHeight,
  factors = DEFAULT_FACTORS,
}: {
  boxStr: string;
  screenWidth: number;
  screenHeight: number;
  factors?: Factors;
}) => {
  if (!boxStr) {
    return { x: null, y: null };
  }
  const coords = boxStr
    .replace('[', '')
    .replace(']', '')
    .split(',')
    .map((num) => parseFloat(num.trim()));

  const [x1, y1, x2 = x1, y2 = y1] = coords;
  const [widthFactor, heightFactor] = factors;

  return {
    x: Math.round(((x1 + x2) / 2) * screenWidth * widthFactor) / widthFactor,
    y: Math.round(((y1 + y2) / 2) * screenHeight * heightFactor) / heightFactor,
  };
};

export const processVlmParams = (
  conversations: Message[],
  images: string[],
) => {
  // Check if the images array exceeds the limit
  // TODO: configurable max image length
  if (images.length > MAX_IMAGE_LENGTH) {
    // Calculate the number of items to remove
    const excessCount = images.length - MAX_IMAGE_LENGTH;

    // Remove excess images from the start
    images = images.slice(excessCount);

    // Remove corresponding conversations where "value" is "<image>"
    let imageCountToRemove = excessCount;
    conversations = conversations.filter((convo) => {
      if (imageCountToRemove > 0 && convo.value === IMAGE_PLACEHOLDER) {
        imageCountToRemove--;
        return false;
      }
      return true;
    });
  }

  // Return the processed result
  return { images, conversations };
};

export const toVlmModelFormat = ({
  conversations,
  systemPrompt,
}: {
  conversations: Conversation[];
  systemPrompt: string;
}): {
  conversations: Message[];
  images: string[];
} => {
  return {
    conversations: conversations.map((conv, idx) => {
      if (idx === 0 && conv.from === 'human') {
        return {
          from: conv.from,
          value: `${systemPrompt}${conv.value}`,
        };
      }
      return {
        from: conv.from,
        value: conv.value,
      };
    }),
    images: conversations
      .filter(
        (conv) => conv.value === IMAGE_PLACEHOLDER && !!conv.screenshotBase64,
      )
      .map((conv) => conv.screenshotBase64!),
  };
};

export const getSummary = (prediction: string) =>
  prediction
    .replace(/Reflection:[\s\S]*?(?=Action_Summary:|Action:|$)/g, '')
    .trim();

/**
 * convert conversations to OpenAI ChatCompletionMessageParam
 * @param conversations conversations
 * @param images images
 * @returns OpenAI ChatCompletionMessageParam
 */
export const convertToOpenAIMessages = ({
  conversations,
  images,
}: {
  conversations: Message[];
  images: string[];
}): Array<ChatCompletionMessageParam> => {
  const messages: Array<ChatCompletionMessageParam> = [];
  let imageIndex = 0;

  conversations.forEach((conv) => {
    if (conv.value === IMAGE_PLACEHOLDER) {
      // handle image message
      if (imageIndex < images.length) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${images[imageIndex]}` },
            },
          ],
        });
        imageIndex++;
      }
    } else {
      // handle text message
      messages.push({
        role: conv.from === 'human' ? 'user' : 'assistant',
        content: conv.value,
      });
    }
  });

  return messages;
};

export function replaceBase64Prefix(base64: string) {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

export async function preprocessResizeImage(
  image_base64: string,
  maxPixels: number,
): Promise<string> {
  try {
    const imageBuffer = Buffer.from(image_base64, 'base64');

    const image = await Jimp.read(imageBuffer);
    const { width, height } = image.bitmap;

    const currentPixels = width * height;
    if (currentPixels > maxPixels) {
      const resizeFactor = Math.sqrt(maxPixels / currentPixels);
      const newWidth = Math.floor(width * resizeFactor);
      const newHeight = Math.floor(height * resizeFactor);

      const resized = await image
        .resize({
          w: newWidth,
          h: newHeight,
        })
        .getBuffer('image/png', { quality: 60 });

      return resized.toString('base64');
    }

    const base64 = await image.getBase64('image/png', { quality: 60 });

    return replaceBase64Prefix(base64);
  } catch (error) {
    console.error('preprocessResizeImage error:', error);
    throw error;
  }
}
