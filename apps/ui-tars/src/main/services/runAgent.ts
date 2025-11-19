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
// import { showPredictionMarker } from '@main/window/ScreenMarker';
import { SettingStore } from '@main/store/setting';
import { AppState, Operator } from '@main/store/types';
import { GUIAgentManager } from '../ipcRoutes/agent';
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
import OpenAI from 'openai';
import { SOPManager } from './sopManager';

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

  // 创建 operator 实例（用于 SOP 执行和 GUIAgent）
  let operatorType: 'computer' | 'browser' = 'computer';
  let operator:
    | NutJSElectronOperator
    | DefaultBrowserOperator
    | RemoteComputerOperator
    | RemoteBrowserOperator
    | undefined = undefined;

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
      setState({
        ...getState(),
        status: StatusEnum.ERROR,
        errorMsg: `不支持的 operator 类型: ${settings.operator}`,
      });
      return;
  }

  // 确保 operator 已定义
  if (!operator) {
    setState({
      ...getState(),
      status: StatusEnum.ERROR,
      errorMsg: '无法创建 operator 实例',
    });
    return;
  }

  // 初始化 SOP 管理器并尝试匹配 SOP
  const sopManager = SOPManager.getInstance();
  await sopManager.loadSOPIndex();

  const sopFilePath = sopManager.findMatchingSOP(instructions);

  // 如果找到匹配的 SOP，则执行 SOP
  if (sopFilePath && operator) {
    try {
      logger.info(`[runAgent] 找到匹配的 SOP: ${sopFilePath}，开始执行`);
      const sop = await sopManager.loadSOP(sopFilePath);

      if (sop) {
        // 添加 SOP 执行开始的消息
        setState({
          ...getState(),
          messages: [
            ...(getState().messages || []),
            {
              from: 'gpt',
              value: `正在执行标准操作程序: ${sop.title}`,
              timing: {
                start: Date.now(),
                end: Date.now(),
                cost: 0,
              },
            },
          ],
        });

        await sopManager.executeSOP(sop, operator);

        // SOP 执行完成后，等待 1000ms 再进行截图
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 添加 SOP 执行完成的消息
        setState({
          ...getState(),
          messages: [
            ...(getState().messages || []),
            {
              from: 'gpt',
              value: `标准操作程序执行完成: ${sop.title}`,
              timing: {
                start: Date.now(),
                end: Date.now(),
                cost: 0,
              },
            },
          ],
        });

        logger.info(`[runAgent] SOP 执行完成: ${sop.title}`);
      }
    } catch (error) {
      logger.error(`[runAgent] SOP 执行失败:`, error);

      // 添加 SOP 执行失败的消息
      setState({
        ...getState(),
        messages: [
          ...(getState().messages || []),
          {
            from: 'gpt',
            value: `标准操作程序执行失败，将使用常规模式继续执行任务`,
            timing: {
              start: Date.now(),
              end: Date.now(),
              cost: 0,
            },
          },
        ],
      });
    }
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

    // if (
    //   settings.operator === Operator.LocalComputer &&
    //   predictionParsed?.length &&
    //   screenshotContext?.size &&
    //   !abortController?.signal?.aborted
    // ) {
    //   showPredictionMarker(predictionParsed, screenshotContext);
    // }

    setState({
      ...getState(),
      status,
      restUserData,
      messages: [...(getState().messages || []), ...conversationsWithSoM],
    });
  };

  let modelVersion = getModelVersion(settings.vlmProvider);
  let modelConfig: UITarsModelConfig = {
    baseURL: settings.vlmBaseUrl,
    // secretlint-disable-next-line
    apiKey: settings.vlmApiKey,
    model: settings.vlmModelName,
    useResponsesApi: settings.useResponsesApi,
  };
  let modelAuthHdrs: Record<string, string> = {};

  if (
    settings.operator === Operator.RemoteComputer ||
    settings.operator === Operator.RemoteBrowser
  ) {
    const useResponsesApi = await ProxyClient.getRemoteVLMResponseApiSupport();
    modelConfig = {
      baseURL: FREE_MODEL_BASE_URL,
      // secretlint-disable-next-line
      apiKey: '',
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

  // 检查最后一个动作是否是 finished
  const currentMessages = getState().messages;
  const lastMessage = currentMessages[currentMessages.length - 1];

  if (
    lastMessage?.predictionParsed &&
    lastMessage.predictionParsed.some((pred) => pred.action_type === 'finished')
  ) {
    logger.info(
      '[runAgent] Detected finished action, predicting next user actions',
    );

    try {
      // 获取 finished 动作的 content
      const finishedAction = lastMessage.predictionParsed.find(
        (pred) => pred.action_type === 'finished',
      );
      const finishedContent =
        finishedAction?.action_inputs?.content || '任务已完成';

      logger.info('[runAgent] Finished content:', finishedContent);

      // 构建新的 system prompt
      const predictionSystemPrompt = `你是一个GUI AGgent，帮助用户来执行任务，用户已经完成了${finishedContent}\n\n
      你需要根据当前已经完成的任务来预测用户接下来可能的1-4个动作，每个动作都用\n分开,动作内容保持精简。
      请按照下面的格式回复：
      接下来要不要我帮您：\n
      xxxx\nxxxx\nxxxx\nxxxx
      例如：用户刚才完成了创建日程，接下来你需要这样回复：
      接下来要不要我帮您：\n
      添加会议参与者\n修改日程时间\n修改日程内容\n删除日程`;

      // 创建 OpenAI 客户端，使用与 guiAgent 相同的配置
      /* secretlint-disable */
      const openai = new OpenAI({
        baseURL: modelConfig.baseURL,
        // secretlint-disable-next-line
        apiKey: modelConfig.apiKey,
        maxRetries: 0,
      });
      /* secretlint-enable */

      logger.info('[runAgent] Calling model for prediction (text-only mode)');

      // 调用模型（纯文本模式，不带图片）
      const predictionResult = await openai.chat.completions.create(
        {
          model: modelConfig.model || settings.vlmModelName,
          messages: [
            {
              role: 'system',
              content: predictionSystemPrompt,
            },
            {
              role: 'user',
              content: '请预测用户接下来可能的操作',
            },
          ],
        },
        {
          timeout: 300000,
          headers: modelAuthHdrs,
        },
      );

      logger.info(
        '[runAgent] Model prediction response received:',
        JSON.stringify(predictionResult),
      );

      const predictionContent = predictionResult.choices?.[0]?.message?.content;

      if (predictionContent) {
        logger.info('[runAgent] Predicted next actions:', predictionContent);

        // 将预测结果加入对话框
        const predictionMessage: ConversationWithSoM = {
          from: 'gpt',
          value: predictionContent,
          timing: {
            start: Date.now(),
            end: Date.now(),
            cost: 0,
          },
          // 添加标记，表示这是可点击的建议动作
          isPredictionSuggestions: true,
        };

        setState({
          ...getState(),
          messages: [...getState().messages, predictionMessage],
        });

        logger.info('[runAgent] Prediction message added to state');
      } else {
        logger.warn('[runAgent] No prediction content in response');
      }
    } catch (error) {
      logger.error('[runAgent] Error predicting next actions:', error);
      if (error instanceof Error) {
        logger.error('[runAgent] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }

  afterAgentRun(settings.operator);
};
