/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Conversation } from '@ui-tars/shared/types';

export const isCallUserMessage = (messages: Conversation[]) => {
  const lastMessage = messages?.[messages?.length - 1];
  const lastPredictionParsed =
    lastMessage?.predictionParsed?.[lastMessage?.predictionParsed?.length - 1];

  return lastPredictionParsed?.action_type === 'call_user';
};
