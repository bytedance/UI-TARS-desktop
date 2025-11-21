/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'assert';

import { logger } from '@main/logger';
import { StatusEnum, type Message } from '@ui-tars/shared/types';
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
import { showWidgetWindow, showScreenWaterFlow } from '../window/ScreenMarker';
import { FREE_MODEL_BASE_URL } from '../remote/shared';
import { getAuthHeader } from '../remote/auth';
import { ProxyClient } from '../remote/proxyClient';
import { UITarsModel, type UITarsModelConfig } from '@ui-tars/sdk/core';
import OpenAI from 'openai';
import { SOPManager } from './sopManager';
import { showMainWindow, hideMainWindow } from '../window';
import * as fs from 'fs';
import * as path from 'path';
import { InvokeParams, InvokeOutput } from '@ui-tars/sdk/core';

// 创建一个自定义的UITarsModel子类，用于保存模型请求
class RequestSavingUITarsModel extends UITarsModel {
  constructor(modelConfig: UITarsModelConfig) {
    super(modelConfig);
  }

  async invoke(params: InvokeParams): Promise<InvokeOutput> {
    // 在调用父类方法之前保存请求
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    saveModelRequest(requestId, params.conversations);

    // 调用父类方法
    return super.invoke(params);
  }
}

// 创建一个新函数来处理finished之后的动作预测
const predictNextActions = async (
  getState: () => AppState,
  setState: (state: AppState) => void,
  modelConfig: UITarsModelConfig,
  modelAuthHdrs: Record<string, string>,
  settings: any,
) => {
  // 检查最后一个动作是否是 finished
  const currentMessages = getState().messages;
  const lastMessage = currentMessages[currentMessages.length - 1];

  if (
    lastMessage?.predictionParsed &&
    lastMessage.predictionParsed.some((pred) => pred.action_type === 'finished')
  ) {
    logger.info(
      '[predictNextActions] Detected finished action, predicting next user actions',
    );

    try {
      // 获取 finished 动作的 content
      const finishedAction = lastMessage.predictionParsed.find(
        (pred) => pred.action_type === 'finished',
      );
      const finishedContent =
        finishedAction?.action_inputs?.content || '任务已完成';

      logger.info('[predictNextActions] Finished content:', finishedContent);

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

      logger.info(
        '[predictNextActions] Calling model for prediction (text-only mode)',
      );

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
        '[predictNextActions] Model prediction response received:',
        JSON.stringify(predictionResult),
      );

      const predictionContent = predictionResult.choices?.[0]?.message?.content;

      if (predictionContent) {
        logger.info(
          '[predictNextActions] Predicted next actions:',
          predictionContent,
        );

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

        logger.info('[predictNextActions] Prediction message added to state');
      } else {
        logger.warn('[predictNextActions] No prediction content in response');
      }
    } catch (error) {
      logger.error(
        '[predictNextActions] Error predicting next actions:',
        error,
      );
      if (error instanceof Error) {
        logger.error('[predictNextActions] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }
};

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  logger.info('runAgent');

  // 清空temp文件夹，为新的任务做准备
  clearTempFolder();

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
    // 创建一个临时数组来存储SOP执行过程中的消息
    const sopExecutionMessages: ConversationWithSoM[] = [];
    let sopTitle = ''; // 用于存储SOP标题，在catch块中使用

    try {
      logger.info(`[runAgent] 找到匹配的 SOP: ${sopFilePath}，开始执行`);
      const sop = await sopManager.loadSOP(sopFilePath);
      sopTitle = sop?.title || ''; // 保存SOP标题

      if (sop) {
        // SOP 命中匹配后，隐藏主窗口
        showWidgetWindow();
        showScreenWaterFlow();
        hideMainWindow();

        // 添加 SOP 执行开始的消息
        const startMessage: ConversationWithSoM = {
          from: 'gpt',
          value: `正在执行标准操作程序: ${sop.title}`,
          timing: {
            start: Date.now(),
            end: Date.now(),
            cost: 0,
          },
        };

        // 先添加到临时数组
        sopExecutionMessages.push(startMessage);

        // 更新状态显示开始消息
        setState({
          ...getState(),
          messages: [...getState().messages, startMessage],
        });

        // 定义回调函数，用于在执行每个动作时收集thought和action信息
        const onActionExecute = (action: any, index: number, total: number) => {
          logger.info(
            `[runAgent] 执行SOP动作 ${index + 1}/${total}: ${action.action_type}`,
          );

          // 将SOPAction转换为PredictionParsed格式
          const predictionParsed = {
            reflection: action.reflection || null,
            thought: action.thought || '',
            action_type: action.action_type,
            action_inputs: action.action_inputs || {},
          };

          // 创建与GUIAgent相同格式的消息
          const actionMessage: ConversationWithSoM = {
            from: 'gpt',
            value: '', // 这个值会被ThoughtChain组件忽略
            timing: {
              start: Date.now(),
              end: Date.now(),
              cost: 0,
            },
            predictionParsed: [predictionParsed], // 将SOP动作转换为predictionParsed格式
          };

          // 只添加到临时数组，不在执行过程中实时更新状态
          sopExecutionMessages.push(actionMessage);
        };

        // 执行SOP，传入回调函数
        await sopManager.executeSOP(sop, operator, onActionExecute);

        // SOP 执行结束后，显示主窗口
        //hideWidgetWindow();
        //closeScreenMarker();
        //hideScreenWaterFlow();
        showMainWindow();

        // SOP 执行完成后，等待 1000ms 再进行截图
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 添加 SOP 执行完成的消息
        const endMessage: ConversationWithSoM = {
          from: 'gpt',
          value: `标准操作程序执行完成: ${sop.title}`,
          timing: {
            start: Date.now(),
            end: Date.now(),
            cost: 0,
          },
        };

        // 添加到临时数组
        sopExecutionMessages.push(endMessage);

        // SOP执行成功，将剩余的SOP执行过程中的消息添加到状态中（跳过已添加的开始消息）
        const remainingMessages = sopExecutionMessages.slice(1); // 跳过第一个消息（开始消息）

        // 记录当前状态中的消息数量和即将添加的消息数量
        const currentMessages = getState().messages;
        logger.info(
          `[runAgent] SOP执行完成，当前状态中有${currentMessages.length}条消息，即将添加${remainingMessages.length}条新消息`,
        );

        // 更新状态
        setState({
          ...getState(),
          messages: [...currentMessages, ...remainingMessages],
        });

        // 将SOP执行过程中的消息转换为Message格式，并更新sessionHistoryMessages
        const sopMessagesAsHistory: Message[] = sopExecutionMessages.map(
          (msg) => ({
            from: msg.from,
            value:
              msg.value ||
              (msg.predictionParsed && msg.predictionParsed[0]
                ? `Thought: ${msg.predictionParsed[0].thought}\nAction: ${msg.predictionParsed[0].action_type}(${JSON.stringify(msg.predictionParsed[0].action_inputs)})`
                : ''),
          }),
        );

        // 获取当前的sessionHistoryMessages并添加SOP执行过程中的消息
        const currentSessionHistory = getState().sessionHistoryMessages;
        setState({
          ...getState(),
          sessionHistoryMessages: [
            ...currentSessionHistory,
            ...sopMessagesAsHistory,
          ],
        });

        // 记录所有SOP执行消息，用于调试
        logger.info(
          `[runAgent] SOP执行完成，共添加了${sopExecutionMessages.length}条消息到状态中，${sopMessagesAsHistory.length}条消息到sessionHistoryMessages中`,
        );

        logger.info(`[runAgent] SOP 执行完成: ${sop.title}`);
      }
    } catch (error) {
      logger.error(`[runAgent] SOP 执行失败:`, error);

      // SOP 执行失败时，确保显示主窗口
      showMainWindow();

      // 添加 SOP 执行失败的消息
      const failureMessage: ConversationWithSoM = {
        from: 'gpt',
        value: `标准操作程序执行失败，将使用常规模式继续执行任务`,
        timing: {
          start: Date.now(),
          end: Date.now(),
          cost: 0,
        },
      };

      // 只添加失败消息，不添加SOP执行过程中的消息
      // 首先获取当前状态，然后移除可能已经添加的开始消息
      const currentMessages = getState().messages;
      const messagesWithoutSop = currentMessages.filter(
        (msg) => msg.value !== `正在执行标准操作程序: ${sopTitle}`,
      );

      setState({
        ...getState(),
        messages: [...messagesWithoutSop, failureMessage],
      });

      // 清空临时数组，不保留SOP执行过程中的消息
      sopExecutionMessages.length = 0;
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

  // 创建自定义的UITarsModel实例
  const customModel = new RequestSavingUITarsModel(modelConfig);

  const guiAgent = new GUIAgent({
    model: customModel,
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

  // 在SOP执行完成后重新获取sessionHistoryMessages，确保包含SOP执行过程中的消息
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

  // 执行afterAgentRun，恢复窗口状态
  afterAgentRun(settings.operator);

  // 在afterAgentRun之后执行finished动作预测
  await predictNextActions(
    getState,
    setState,
    modelConfig,
    modelAuthHdrs,
    settings,
  );
};

// 工具函数：清空temp文件夹
const clearTempFolder = () => {
  try {
    // 使用项目根目录下的apps/ui-tars/temp文件夹
    const tempPath = path.join(__dirname, '..', '..', 'temp');

    // 如果temp文件夹不存在，则创建它
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
      logger.info(`[clearTempFolder] Created temp folder: ${tempPath}`);
      return;
    }

    // 读取文件夹中的所有文件
    const files = fs.readdirSync(tempPath);

    // 删除每个文件
    files.forEach((file) => {
      const filePath = path.join(tempPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        fs.unlinkSync(filePath);
        logger.info(`[clearTempFolder] Deleted file: ${filePath}`);
      }
    });

    logger.info(
      `[clearTempFolder] Cleared ${files.length} files from temp folder: ${tempPath}`,
    );
  } catch (error) {
    logger.error('[clearTempFolder] Error clearing temp folder:', error);
  }
};

// 工具函数：保存模型请求到JSON文件
const saveModelRequest = (requestId: string, messages: any[]) => {
  try {
    // 使用项目根目录下的apps/ui-tars/temp文件夹
    const tempPath = path.join(__dirname, '..', '..', 'temp');

    // 确保temp文件夹存在
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    // 过滤消息，只保留文本内容，移除base64图片
    const textOnlyMessages = messages.map((msg) => {
      const textMsg = { ...msg };

      // 如果消息有content字段且是数组，过滤掉图片类型的content
      if (Array.isArray(textMsg.content)) {
        textMsg.content = textMsg.content.filter((item: any) => {
          // 保留文本类型的content，过滤掉图片类型的content
          return item.type === 'text';
        });
      }

      return textMsg;
    });

    // 创建请求数据
    const requestData = {
      id: requestId,
      timestamp: new Date().toISOString(),
      messages: textOnlyMessages,
    };

    // 生成文件名
    const fileName = `request_${requestId}_${Date.now()}.json`;
    const filePath = path.join(tempPath, fileName);

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(requestData, null, 2));

    logger.info(`[saveModelRequest] Saved model request to: ${filePath}`);
  } catch (error) {
    logger.error('[saveModelRequest] Error saving model request:', error);
  }
};
