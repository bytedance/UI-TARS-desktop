/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Design Note:
 *
 * Currently, since the format we defined previously is close to the essential functionality of OpenAI,
 * in order to avoid redundant conversions, we will adopt OpenAI's Chat Completion as the standard until
 * we find that OpenAI cannot meet our multimodal design requirements.
 *
 * @type {import('./third-party')}
 */

// import { MessageContent } from 'openai/resources/beta/threads/messages';

// export { MessageContent };

// /**
//  * Message role enumeration
//  */
// export type MessageRole = 'user' | 'assistant';

// /**
//  * Message content type enumeration
//  */
// export type MessageContentType = 'text' | 'images' | 'video' | 'thinking';

// /**
//  * Message content interface
//  */
// export interface MessageContent {
//   type: MessageContentType;
//   content: string | string[];
// }

// /**
//  * A multimodal message interface
//  */
// export interface Message {
//   role: MessageRole;
//   content: MessageContent[];
// }
