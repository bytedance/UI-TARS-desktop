/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { customAlphabet } from 'nanoid';

export const generateShareId = () => {
  // 自定义字符集（数字和小写字母）
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const nanoid = customAlphabet(alphabet, 10);
  return nanoid();
};

export function choose<T>(choices: T[]): T {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
