/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources';
import { Questions } from './question';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.ARK_TEST_KEY,
    baseURL: process.env.ARK_TEST_URL,
  });

  const messages: Array<ChatCompletionMessageParam> = [
    { role: 'user', content: Questions.Weather },
  ];

  const ans = await openai.chat.completions.create({
    model: 'ep-20250627155918-4jmhg',
    messages: messages,
  });

  console.log('whole ans: ', ans);
  console.log('content: ', ans.choices[0].message.content);
}

main();
