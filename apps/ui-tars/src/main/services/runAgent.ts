/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'assert';

import { logger } from '@main/logger';
import { hideWindowBlock } from '@main/window/index';
import { StatusEnum, UITarsModelVersion } from '@ui-tars/shared/types';
import { type ConversationWithSoM } from '@main/shared/types';
import { GUIAgent, type GUIAgentConfig } from '@ui-tars/sdk';
import { markClickPosition } from '@main/utils/image';
import { UTIOService } from '@main/services/utio';
import { NutJSElectronOperator } from '../agent/operator';
import {
  DefaultBrowserOperator,
  SearchEngine,
} from '@ui-tars/operator-browser';
import {
  getSystemPrompt,
  getSystemPromptV1_5,
  getSystemPromptDoubao_15_15B,
  getSystemPromptDoubao_15_20B,
} from '../agent/prompts';
import {
  closeScreenMarker,
  hideWidgetWindow,
  hideScreenWaterFlow,
  showWidgetWindow,
  showPredictionMarker,
  showScreenWaterFlow,
} from '@main/window/ScreenMarker';
import { SettingStore } from '@main/store/setting';
import {
  AppState,
  SearchEngineForSettings,
  VLMProviderV2,
} from '@main/store/types';
import { GUIAgentManager } from '../ipcRoutes/agent';
import { checkBrowserAvailability } from './browserCheck';

const getModelVersion = (
  provider: VLMProviderV2 | undefined,
): UITarsModelVersion => {
  switch (provider) {
    case VLMProviderV2.ui_tars_1_5:
      return UITarsModelVersion.V1_5;
    case VLMProviderV2.ui_tars_1_0:
      return UITarsModelVersion.V1_0;
    case VLMProviderV2.doubao_1_5:
      return UITarsModelVersion.DOUBAO_1_5_15B;
    case VLMProviderV2.doubao_1_5_vl:
      return UITarsModelVersion.DOUBAO_1_5_20B;
    default:
      return UITarsModelVersion.V1_0;
  }
};

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  logger.info('runAgent');
  const settings = SettingStore.getStore();
  const { instructions, abortController } = getState();
  assert(instructions, 'instructions is required');

  const language = settings.language ?? 'en';

  showWidgetWindow();
  if (settings.operator === 'nutjs') {
    showScreenWaterFlow();
  }

  const handleData: GUIAgentConfig<NutJSElectronOperator>['onData'] = async ({
    data,
  }) => {
    const lastConv = getState().messages[getState().messages.length - 1];
    const { status, conversations, ...restUserData } = data;
    logger.info('[onGUIAgentData] status', status, conversations.length);

    // add SoM to conversations
    const conversationsWithSoM: ConversationWithSoM[] = await Promise.all(
      conversations.map(async (conv) => {
        const { screenshotContext, predictionParsed } = conv;
        if (
          lastConv?.screenshotBase64 &&
          screenshotContext?.size &&
          predictionParsed
        ) {
          const screenshotBase64WithElementMarker = await markClickPosition({
            screenshotContext,
            base64: lastConv?.screenshotBase64,
            parsed: predictionParsed,
          }).catch((e) => {
            logger.error('[markClickPosition error]:', e);
            return '';
          });
          return {
            ...conv,
            screenshotBase64WithElementMarker,
          };
        }
        return conv;
      }),
    ).catch((e) => {
      logger.error('[conversationsWithSoM error]:', e);
      return conversations;
    });

    const {
      screenshotBase64,
      predictionParsed,
      screenshotContext,
      screenshotBase64WithElementMarker,
      ...rest
    } = conversationsWithSoM?.[conversationsWithSoM.length - 1] || {};
    logger.info(
      '[onGUIAgentData] ======data======\n',
      predictionParsed,
      screenshotContext,
      rest,
      status,
      '\n========',
    );

    if (
      settings.operator === 'nutjs' &&
      predictionParsed?.length &&
      screenshotContext?.size &&
      !abortController?.signal?.aborted
    ) {
      showPredictionMarker(predictionParsed, screenshotContext);
    }

    setState({
      ...getState(),
      status,
      restUserData,
      messages: [...(getState().messages || []), ...conversationsWithSoM],
    });
  };

  const lastStatus = getState().status;

  let operator: NutJSElectronOperator | DefaultBrowserOperator;
  if (settings.operator === 'nutjs') {
    operator = new NutJSElectronOperator();
  } else {
    await checkBrowserAvailability();
    const { browserAvailable } = getState();
    if (!browserAvailable) {
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg:
          'Browser is not available. Please install Chrome and try again.',
      });
      return;
    }
    const SEARCH_ENGINE_MAP: Record<SearchEngineForSettings, SearchEngine> = {
      [SearchEngineForSettings.GOOGLE]: SearchEngine.GOOGLE,
      [SearchEngineForSettings.BING]: SearchEngine.BING,
      [SearchEngineForSettings.BAIDU]: SearchEngine.BAIDU,
    };
    operator = await DefaultBrowserOperator.getInstance(
      false,
      false,
      lastStatus === StatusEnum.CALL_USER,
      SEARCH_ENGINE_MAP[
        settings.searchEngineForBrowser || SearchEngineForSettings.GOOGLE
      ],
    );
  }

  const modelVersion = getModelVersion(settings.vlmProvider);

  const getSpByModelVersion = (modelVersion: UITarsModelVersion) => {
    switch (modelVersion) {
      case UITarsModelVersion.DOUBAO_1_5_20B:
        return getSystemPromptDoubao_15_20B(language);
      case UITarsModelVersion.DOUBAO_1_5_15B:
        return getSystemPromptDoubao_15_15B(language);
      case UITarsModelVersion.V1_5:
        return getSystemPromptV1_5(language, 'normal');
      default:
        return getSystemPrompt(language);
    }
  };

  const guiAgent = new GUIAgent({
    model: {
      baseURL: settings.vlmBaseUrl,
      apiKey: settings.vlmApiKey,
      model: settings.vlmModelName,
    },
    systemPrompt: getSpByModelVersion(modelVersion),
    logger,
    signal: abortController?.signal,
    operator: operator,
    onData: handleData,
    onError: (params) => {
      const { error } = params;
      logger.error('[onGUIAgentError]', settings, error);
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: JSON.stringify({
          status: error?.status,
          message: error?.message,
          stack: error?.stack,
        }),
      });
    },
    retry: {
      model: {
        maxRetries: 3,
      },
      screenshot: {
        maxRetries: 5,
      },
      execute: {
        maxRetries: 1,
      },
    },
    maxLoopCount: settings.maxLoopCount,
    loopIntervalInMs: settings.loopIntervalInMs,
    uiTarsVersion: modelVersion,
  });

  GUIAgentManager.getInstance().setAgent(guiAgent);

  await hideWindowBlock(async () => {
    await UTIOService.getInstance().sendInstruction(instructions);

    await guiAgent
      .run(instructions)
      .catch((e) => {
        logger.error('[runAgentLoop error]', e);
        setState({
          ...getState(),
          status: StatusEnum.ERROR,
          errorMsg: e.message,
        });
      })
      .finally(() => {
        hideWidgetWindow();
        if (settings.operator === 'nutjs') {
          closeScreenMarker();
          hideScreenWaterFlow();
        }
      });
  }).catch((e) => {
    logger.error('[runAgent error hideWindowBlock]', settings, e);
  });
};
