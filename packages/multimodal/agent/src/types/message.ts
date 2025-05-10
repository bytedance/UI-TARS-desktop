/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Message role enumeration
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message content type enumeration
 */
export type MessageContentType = 'text' | 'images' | 'video' | 'thinking';

/**
 * Message content interface
 */
export interface MessageContent {
  type: MessageContentType;
  content: string | string[];
}

/**
 * A multimodal message interface
 */
export interface Message {
  role: MessageRole;
  content: MessageContent[];
}
