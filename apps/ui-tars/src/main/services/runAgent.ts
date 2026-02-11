/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'assert';

import { logger } from '@main/logger';
import { StatusEnum } from '@ui-tars/shared/types';
import { type ConversationWithSoM } from '@main/shared/types';
import { GUIAgent, type GUIAgentConfig } from '@ui-tars/sdk';
import { markClickPosition } from '@main/utils/image';
import { UTIOService } from '@main/services/utio';
import { NutJSElectronOperator } from '../agent/operator';
import {
  createRemoteBrowserOperator,
  RemoteComputerOperator,
} from '../remote/operators';
import {
  DefaultBrowserOperator,
  RemoteBrowserOperator,
} from '@ui-tars/operator-browser';
import { showPredictionMarker } from '@main/window/ScreenMarker';
import { SettingStore } from '@main/store/setting';
import { AppState, Operator, VLMProviderV2 } from '@main/store/types';
import { GUIAgentManager } from '../ipcRoutes/agent';
import { CodexAuthService } from '@main/services/codexAuth';
import { checkBrowserAvailability } from './browserCheck';
import {
  getModelVersion,
  getSpByModelVersion,
  beforeAgentRun,
  afterAgentRun,
  getLocalBrowserSearchEngine,
} from '../utils/agent';
import { FREE_MODEL_BASE_URL } from '../remote/shared';
import { getAuthHeader } from '../remote/auth';
import { ProxyClient } from '../remote/proxyClient';
import { UITarsModelConfig } from '@ui-tars/sdk/core';
import {
  CODEX_OPENAI_BETA,
  CODEX_ORIGINATOR,
  VLM_PROVIDER_REGISTRY,
  getCodexReasoningEffortByModel,
} from '@main/store/modelRegistry';

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  logger.info('runAgent');
  const settings = SettingStore.getStore();
  const { instructions, abortController } = getState();
  assert(instructions, 'instructions is required');

  const language = settings.language ?? 'en';

  logger.info('settings.operator', settings.operator);

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
      settings.operator === Operator.LocalComputer &&
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

  let operatorType: 'computer' | 'browser' = 'computer';
  let operator:
    | NutJSElectronOperator
    | DefaultBrowserOperator
    | RemoteComputerOperator
    | RemoteBrowserOperator;

  switch (settings.operator) {
    case Operator.LocalComputer:
      operator = new NutJSElectronOperator();
      operatorType = 'computer';
      break;
    case Operator.LocalBrowser:
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

      operator = await DefaultBrowserOperator.getInstance(
        false,
        false,
        false,
        getState().status === StatusEnum.CALL_USER,
        getLocalBrowserSearchEngine(settings.searchEngineForBrowser),
      );
      operatorType = 'browser';
      break;
    case Operator.RemoteComputer:
      operator = await RemoteComputerOperator.create();
      operatorType = 'computer';
      break;
    case Operator.RemoteBrowser:
      operator = await createRemoteBrowserOperator();
      operatorType = 'browser';
      break;
    default:
      break;
  }

  let modelVersion = getModelVersion(settings.vlmProvider);
  const isRemoteOperator =
    settings.operator === Operator.RemoteComputer ||
    settings.operator === Operator.RemoteBrowser;
  const isCodexOAuthProvider =
    settings.vlmProvider === VLMProviderV2.openai_codex_oauth;
  const authField = 'apiKey' as const;
  let modelConfig: UITarsModelConfig = {
    baseURL: settings.vlmBaseUrl,
    [authField]: settings.vlmApiKey || '',
    model: settings.vlmModelName,
    useResponsesApi: isCodexOAuthProvider ? true : settings.useResponsesApi,
  };
  let modelAuthHdrs: Record<string, string> = {};

  if (isCodexOAuthProvider && !isRemoteOperator) {
    const codexAuthContext =
      await CodexAuthService.getInstance().getAccessContext();
    const codexProviderConfig =
      VLM_PROVIDER_REGISTRY[VLMProviderV2.openai_codex_oauth];

    if (!codexAuthContext?.accessToken || !codexAuthContext.accountId) {
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg:
          'OpenAI Codex OAuth is not connected. Please connect in Settings > VLM.',
      });
      return;
    }

    modelConfig = {
      ...modelConfig,
      baseURL: settings.vlmBaseUrl || codexProviderConfig.defaultBaseUrl,
      [authField]: settings.vlmApiKey || '',
      useResponsesApi: true,
      codexResponses: {
        enabled: true,
        store: false,
        include: ['reasoning.encrypted_content'],
        reasoningEffort: getCodexReasoningEffortByModel(settings.vlmModelName),
      },
    };

    modelAuthHdrs = {
      Authorization: `Bearer ${codexAuthContext.accessToken}`,
      'chatgpt-account-id': codexAuthContext.accountId,
      'OpenAI-Beta': CODEX_OPENAI_BETA,
      originator: CODEX_ORIGINATOR,
      accept: 'text/event-stream',
    };
  }

  if (isRemoteOperator) {
    const useResponsesApi = await ProxyClient.getRemoteVLMResponseApiSupport();
    modelConfig = {
      baseURL: FREE_MODEL_BASE_URL,
      [authField]: '',
      model: '',
      useResponsesApi,
    };
    modelAuthHdrs = await getAuthHeader();
    modelVersion = await ProxyClient.getRemoteVLMProvider();
  }

  const systemPrompt = getSpByModelVersion(
    modelVersion,
    language,
    operatorType,
  );

  const guiAgent = new GUIAgent({
    model: modelConfig,
    systemPrompt: systemPrompt,
    logger,
    signal: abortController?.signal,
    operator: operator!,
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
        maxRetries: 5,
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
  UTIOService.getInstance().sendInstruction(instructions);

  const { sessionHistoryMessages } = getState();

  beforeAgentRun(settings.operator);

  const startTime = Date.now();

  await guiAgent
    .run(instructions, sessionHistoryMessages, modelAuthHdrs)
    .catch((e) => {
      logger.error('[runAgentLoop error]', e);
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: e.message,
      });
    });

  logger.info('[runAgent Totoal cost]: ', (Date.now() - startTime) / 1000, 's');

  afterAgentRun(settings.operator);
};
