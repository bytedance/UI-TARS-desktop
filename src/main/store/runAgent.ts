/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'assert';

import { logger } from '@main/logger';
import { hideWindowBlock } from '@main/window/index';
import { StatusEnum } from '@ui-tars/shared/types';

import { ComputerUseAgent } from '../agent';
import { Desktop } from '../agent/device';
import { UITARS } from '../agent/llm/ui-tars';
import { getSystemPrompt } from '../agent/prompts';
import {
  closeScreenMarker,
  hidePauseButton,
  hideScreenWaterFlow,
  showPauseButton,
  showPredictionMarker,
  showScreenWaterFlow,
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

  showPauseButton();
  showScreenWaterFlow();

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
        setState({
          ...getState(),
          status: StatusEnum.ERROR,
          errorMsg: e.message,
        });
      })
      .finally(() => {
        closeScreenMarker();
        hidePauseButton();
        hideScreenWaterFlow();
      });
  }).catch((e) => {
    logger.error('[runAgent error hideWindowBlock]', settings, e);
  });
};
