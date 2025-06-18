/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const IMAGE_PLACEHOLDER = '<image>';
export const MAX_LOOP_COUNT = 100;
export const MAX_IMAGE_LENGTH = 5;

export const IMAGE_FACTOR = 28;
export const DEFAULT_FACTOR = 1000;
export const MIN_PIXELS = 100 * IMAGE_FACTOR * IMAGE_FACTOR;
export const MAX_PIXELS_V1_0 = 2700 * IMAGE_FACTOR * IMAGE_FACTOR;
export const MAX_PIXELS_DOUBAO = 5120 * IMAGE_FACTOR * IMAGE_FACTOR;
export const MAX_PIXELS_V1_5 = 16384 * IMAGE_FACTOR * IMAGE_FACTOR;
export const MAX_RATIO = 200;

export enum VlmModeEnum {
  Chat = 'chat',
  Agent = 'agent',
}

export enum UITarsModelVersion {
  V1_0 = '1.0',
  V1_5 = '1.5',
  DOUBAO_1_5_15B = 'doubao-1.5-15B',
  DOUBAO_1_5_20B = 'doubao-1.5-20B',
}

export const VlmModeEnumOptions = {
  [VlmModeEnum.Agent]: 'Agent 模式',
  [VlmModeEnum.Chat]: 'Chat 模式',
};
