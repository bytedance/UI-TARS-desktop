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
import assert from 'assert';

import { logger } from '@main/logger';
import { hideWindowBlock } from '@main/window/index';

import { ComputerUseAgent } from '../agent';
import { Desktop } from '../agent/device';
import { UITARS } from '../agent/llm/ui-tars';
import { getSystemPrompt } from '../agent/prompts';
import {
  closeScreenMarker,
  showPauseButton,
  showPredictionMarker,
} from './ScreenMarker';
import { SettingStore } from './setting';
import { AppState } from './types';

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  logger.info('runAgent');
  const settings = SettingStore.getStore();
  const { instructions, abortController, getSetting } = getState();
  const device = new Desktop();
  const vlm = new UITARS();
  assert(instructions, 'instructions is required');

  const language = getSetting('language') || 'en';

  const agent = new ComputerUseAgent({
    systemPrompt: getSystemPrompt(language),
    abortController,
    instruction: instructions!,
    device,
    vlm,
  });

  await showPauseButton();

  agent.on('data', (data) => {
    const { status, conversations, ...restUserData } = data;

    const {
      screenshotBase64,
      screenshotBase64WithElementMarker,
      predictionParsed,
      screenshotContext,
      ...rest
    } = data?.conversations?.[data?.conversations.length - 1] || {};
    logger.info(
      '======data======\n',
      predictionParsed,
      screenshotContext,
      rest,
      '\n========',
    );

    // 使用封装后的方法显示标记
    if (
      predictionParsed?.length &&
      screenshotContext?.size &&
      !abortController?.signal?.aborted
    ) {
      showPredictionMarker(predictionParsed, screenshotContext.size);
    }

    setState({
      ...getState(),
      status,
      restUserData,
      messages: [...(getState().messages || []), ...conversations],
    });
  });

  agent.on('error', (e) => {
    logger.error('[runAgent error]', settings, e);
  });

  await hideWindowBlock(async () => {
    await agent
      .runAgentLoop({
        loopWaitTime: () => 800,
      })
      .catch((e) => {
        logger.error('[runAgentLoop error]', e);
      })
      .finally(() => {
        closeScreenMarker();
      });
  }).catch((e) => {
    logger.error('[runAgent error hideWindowBlock]', settings, e);
  });
};
