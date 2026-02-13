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
import { Operator as SDKOperator, UITarsModelConfig } from '@ui-tars/sdk/core';
import {
  CODEX_OPENAI_BETA,
  CODEX_ORIGINATOR,
  VLM_PROVIDER_REGISTRY,
  resolveCodexReasoningEffort,
} from '@main/store/modelRegistry';
import { resolveToolFirstFeatureFlags } from '@main/store/featureFlags';
import { createDefaultToolRegistry } from '@main/tools/toolRegistry';
import { InvokeGateOperator } from '@main/tools/invokeGateOperator';
import { type GateAuthState } from '@main/tools/invokeGate';
import { classifyRuntimeErrorV1 } from '@main/tools/errorTaxonomy';
import {
  CheckpointRecoveryService,
  deriveRecoveryFsmState,
} from '@main/services/checkpointRecovery';
import {
  ReliabilityObservabilityService,
  type ReliabilityRendererState,
} from '@main/services/reliabilityObservability';

const mapStatusToRendererState = (
  status: StatusEnum,
): ReliabilityRendererState => {
  if (status === StatusEnum.CALL_USER) {
    return 'blocked';
  }
  if (status === StatusEnum.ERROR) {
    return 'error';
  }
  if (status === StatusEnum.END || status === StatusEnum.USER_STOPPED) {
    return 'completed';
  }
  return 'executing_tool';
};

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  logger.info('runAgent');
  const settings = SettingStore.getStore();
  const { abortController } = getState();
  const { instructions, sessionHistoryMessages } = getState();
  assert(instructions, 'instructions is required');
  const runtimeSessionId = `main-${Date.now()}`;
  const checkpointRecovery = CheckpointRecoveryService.getInstance();
  const observability = ReliabilityObservabilityService.getInstance();

  const language = settings.language ?? 'en';
  const maxLoopCount = settings.maxLoopCount ?? 100;

  logger.info('settings.operator', settings.operator);
  const toolFlags = resolveToolFirstFeatureFlags(settings);

  if (toolFlags.ffToolRegistry) {
    const registry = createDefaultToolRegistry();
    logger.info(
      '[tool-registry] initialized',
      registry
        .list()
        .map((tool) => `${tool.name}@${tool.toolVersion}`)
        .join(', '),
    );
  }

  const handleData: GUIAgentConfig<SDKOperator>['onData'] = async ({
    data,
  }) => {
    const lastConv = getState().messages[getState().messages.length - 1];
    const { status, conversations, ...restUserData } = data;
    logger.info('[onGUIAgentData] status', status, conversations.length);
    observability.emitRendererState({
      state: mapStatusToRendererState(status),
      sessionId: runtimeSessionId,
      status,
    });

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

    const recoveryFsmState = deriveRecoveryFsmState(status);
    if (
      recoveryFsmState === 'completed' ||
      recoveryFsmState === 'user_stopped'
    ) {
      checkpointRecovery.clearCheckpoint();
      return;
    }

    checkpointRecovery.updateStatus({
      sessionId: runtimeSessionId,
      status,
      fsmState: recoveryFsmState,
    });
  };

  let operatorType: 'computer' | 'browser' = 'computer';
  let operator:
    | NutJSElectronOperator
    | DefaultBrowserOperator
    | RemoteComputerOperator
    | RemoteBrowserOperator
    | null = null;

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

  if (!operator) {
    throw new Error(`Unsupported operator setting: ${settings.operator}`);
  }

  let modelVersion = getModelVersion(settings.vlmProvider);
  const isRemoteOperator =
    settings.operator === Operator.RemoteComputer ||
    settings.operator === Operator.RemoteBrowser;
  const runtimeToolFlags = isRemoteOperator
    ? {
        ...toolFlags,
        ffToolFirstRouting: false,
      }
    : toolFlags;

  if (isRemoteOperator && toolFlags.ffToolFirstRouting) {
    logger.info(
      '[tool-first-routing] disabled for remote operator runtime',
      settings.operator,
    );
  }
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
  let invokeGateAuthState: GateAuthState = 'unknown';

  if (!isCodexOAuthProvider && !isRemoteOperator && settings.vlmApiKey.trim()) {
    invokeGateAuthState = 'valid';
  }

  if (isCodexOAuthProvider && !isRemoteOperator) {
    const codexAuthService = CodexAuthService.getInstance();
    let codexAuthContext: { accessToken: string; accountId?: string } | null;
    try {
      codexAuthContext = await codexAuthService.getAccessContext();
    } catch (error) {
      logger.error('[runAgent] failed to read Codex OAuth session', error);
      let authMessage =
        error instanceof Error ? error.message : String(error ?? 'unknown');
      try {
        const authState = await codexAuthService.getStatus();
        if (authState.status === 'error' && authState.error) {
          authMessage = authState.error;
        }
      } catch (statusError) {
        logger.warn(
          '[runAgent] failed to read Codex OAuth status',
          statusError,
        );
      }

      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: authMessage,
      });
      return;
    }

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
        reasoningEffort: resolveCodexReasoningEffort(
          settings.vlmModelName,
          settings.codexReasoningEffort,
        ),
      },
    };

    modelAuthHdrs = {
      Authorization: `Bearer ${codexAuthContext.accessToken}`,
      'chatgpt-account-id': codexAuthContext.accountId,
      'OpenAI-Beta': CODEX_OPENAI_BETA,
      originator: CODEX_ORIGINATOR,
      accept: 'text/event-stream',
    };
    invokeGateAuthState = 'valid';
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
    invokeGateAuthState = 'valid';
  }

  let runtimeOperator: SDKOperator = operator;
  if (runtimeToolFlags.ffInvokeGate) {
    runtimeOperator = new InvokeGateOperator({
      innerOperator: operator,
      featureFlags: runtimeToolFlags,
      sessionId: runtimeSessionId,
      authState: invokeGateAuthState,
      maxLoopCount,
    });
  }

  checkpointRecovery.beginRun({
    sessionId: runtimeSessionId,
    instruction: instructions,
    sessionHistoryMessages,
  });
  observability.emitRendererState({
    state: 'thinking',
    sessionId: runtimeSessionId,
    status: StatusEnum.RUNNING,
  });

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
    operator: runtimeOperator,
    onData: handleData,
    onError: (params) => {
      const { error } = params;
      const taxonomy = classifyRuntimeErrorV1(error);
      logger.error('[onGUIAgentError]', settings, error);
      observability.emitRendererState({
        state: 'error',
        sessionId: runtimeSessionId,
        status: StatusEnum.ERROR,
      });
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: JSON.stringify({
          status: error?.status,
          message: error?.message,
          stack: error?.stack,
          errorClass: taxonomy.errorClass,
          errorSource: taxonomy.source,
          errorCode: taxonomy.code,
          retryable: taxonomy.retryable,
        }),
      });
      checkpointRecovery.updateStatus({
        sessionId: runtimeSessionId,
        status: StatusEnum.ERROR,
        fsmState: 'error',
        errorMsg: error?.message,
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
    maxLoopCount,
    loopIntervalInMs: settings.loopIntervalInMs,
    uiTarsVersion: modelVersion,
  });

  GUIAgentManager.getInstance().setAgent(guiAgent);
  UTIOService.getInstance().sendInstruction(instructions);

  beforeAgentRun(settings.operator);

  const startTime = Date.now();

  await guiAgent
    .run(instructions, sessionHistoryMessages, modelAuthHdrs)
    .catch((e: unknown) => {
      const taxonomy = classifyRuntimeErrorV1(e);
      logger.error('[runAgentLoop error]', {
        error: e,
        taxonomy,
      });

      const message = e instanceof Error ? e.message : String(e);
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: JSON.stringify({
          message,
          errorClass: taxonomy.errorClass,
          errorSource: taxonomy.source,
          errorCode: taxonomy.code,
          retryable: taxonomy.retryable,
        }),
      });
      checkpointRecovery.updateStatus({
        sessionId: runtimeSessionId,
        status: StatusEnum.ERROR,
        fsmState: 'error',
        errorMsg: message,
      });
    });

  const finalStatus = getState().status;
  observability.emitEvent({
    type: 'recovery.finished',
    sessionId: runtimeSessionId,
    status: finalStatus,
  });
  observability.emitRendererState({
    state: mapStatusToRendererState(finalStatus),
    sessionId: runtimeSessionId,
    status: finalStatus,
  });

  if (
    finalStatus === StatusEnum.END ||
    finalStatus === StatusEnum.USER_STOPPED
  ) {
    checkpointRecovery.clearCheckpoint();
  }

  logger.info('[runAgent Totoal cost]: ', (Date.now() - startTime) / 1000, 's');

  afterAgentRun(settings.operator);
};
