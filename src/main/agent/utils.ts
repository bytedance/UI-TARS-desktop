/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import {
  IMAGE_PLACEHOLDER,
  MAX_IMAGE_LENGTH,
} from '@ui-tars/shared/constants/vlm';
import { Message } from '@ui-tars/shared/types';

import type { VlmRequest } from './llm/base';

export const processVlmParams = ({
  conversations,
  images,
}: VlmRequest): VlmRequest => {
  // Check if the images array exceeds the limit
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

export const getSummary = (prediction: string) =>
  prediction
    .replace(/Reflection:[\s\S]*?(?=Action_Summary:|Action:|$)/g, '')
    .trim();

/**
 * 将对话转换为 OpenAI 的 ChatCompletionMessageParam
 * @param conversations 对话
 * @param images 图片
 * @returns OpenAI 的 ChatCompletionMessageParam
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
      // 处理图片消息
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
      // 处理文本消息
      messages.push({
        role: conv.from === 'human' ? 'user' : 'assistant',
        content: conv.value,
      });
    }
  });

  return messages;
};
