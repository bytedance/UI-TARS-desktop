/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources';
import { Questions } from './question';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OMNI_TARS_API_KEY,
    baseURL: process.env.OMNI_TARS_BASE_URL,
  });

  const messages: Array<ChatCompletionMessageParam> = [
    { role: 'user', content: Questions.Weather },
  ];

  const ans = await openai.chat.completions.create({
    model: process.env.OMNI_TARS_MODEL_ID,
    messages: messages,
  });

  console.log('whole ans: ', ans);
  console.log('content: ', ans.choices[0].message.content);
}

main();
