/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Message } from '@ui-tars/desktop-shared/types';

export interface VlmRequest {
  conversations: Message[];
  images: string[];
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
  abstract invoke({ conversations, images }: T): Promise<K>;
}
