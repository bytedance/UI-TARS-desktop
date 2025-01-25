/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Message } from '@ui-tars/shared/types';

export interface VlmRequest {
  conversations: Message[];
  images: string[];
}

export interface VlmRequestOptions {
  abortController?: AbortController | null;
}

export interface VlmResponse {
  prediction: string;
  reflections?: string[];
}

export interface VlmChatRequest {
  conversations: Message[];
  images: string[];
}

export interface VlmChatResponse {
  prediction: string;
}

export interface VlmConfig {
  model: string;
}

export abstract class VLM<
  T extends VlmRequest = VlmRequest,
  K extends VlmResponse = VlmResponse,
> {
  abstract get vlmModel(): string;
  abstract invoke(
    { conversations, images }: T,
    options?: VlmRequestOptions,
  ): Promise<K>;
}
