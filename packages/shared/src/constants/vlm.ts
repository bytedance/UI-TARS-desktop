/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const IMAGE_PLACEHOLDER = '<image>';
export const MAX_LOOP_COUNT = 25;
export const MAX_IMAGE_LENGTH = 5;

export enum VlmModeEnum {
  Chat = 'chat',
  Agent = 'agent',
}

export const VlmModeEnumOptions = {
  [VlmModeEnum.Agent]: 'Agent 模式',
  [VlmModeEnum.Chat]: 'Chat 模式',
};
