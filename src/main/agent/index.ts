/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable max-lines-per-function */
import retry from 'async-retry';
import mitt, { Emitter, Handler } from 'mitt';

import {
  IMAGE_PLACEHOLDER,
  MAX_LOOP_COUNT,
  VlmModeEnum,
} from '@ui-tars/shared/constants/vlm';
import { ScreenshotResult, StatusEnum } from '@ui-tars/shared/types';
import { ComputerUseUserData, Conversation } from '@ui-tars/shared/types/data';
import { ShareVersion } from '@ui-tars/shared/types/share';
import sleep from '@ui-tars/shared/utils/sleep';

import { logger } from '@main/logger';

import { markClickPosition } from '../utils/image';
import { Desktop } from './device';
import { VLM, VlmRequest } from './llm/base';
import { getSummary, processVlmParams } from './utils';

type AgentEvents = {
  data: ComputerUseUserData;
  error: Partial<ComputerUseUserData> & {
    code: number;
    error: string;
    stack?: string;
  };
};

export class ComputerUseAgent {
  private readonly logger = logger;
  private conversations: Conversation[] = [];
  private startTime: number;
  private status: StatusEnum;
  private lastSentIndex = -1; // 上次发送的 index
  private mode: VlmModeEnum = VlmModeEnum.Agent;
  private emitter: Emitter<AgentEvents>;

  constructor(
    private readonly config: {
      systemPrompt: string;
      abortController: AbortController | null;
      instruction: string;
      device: Desktop;
      vlm: VLM;
    },
  ) {
    this.emitter = mitt<AgentEvents>();
    this.status = StatusEnum.INIT;
    this.startTime = Date.now();
  }

  on<Key extends keyof AgentEvents>(
    type: Key,
    handler: Handler<AgentEvents[Key]>,
  ): void {
    this.emitter.on(type, handler);
  }

  emit<Key extends keyof AgentEvents>(
    type: Key,
    event: AgentEvents[Key],
  ): void {
    this.emitter.emit(type, event);
  }

  private toUserDataFormat(): ComputerUseUserData {
    const { config } = this;
    return {
      version: ShareVersion.V1,
      systemPrompt: config.systemPrompt,
      instruction: config.instruction,
      modelName: `${config.vlm.vlmModel}`,
      mode: this.mode,
      status: this.status,
      logTime: this.startTime,
      conversations: this.conversations,
    };
  }

  private emitData(
    newUserData: Omit<Partial<ComputerUseUserData>, 'conversations'> = {},
  ) {
    const newConversations = this.conversations.slice(this.lastSentIndex + 1);
    // console.log('newConversations', newConversations)
    // if (newConversations.length === 0) return;

    const userDataFormat = this.toUserDataFormat();
    const userData: ComputerUseUserData = {
      ...userDataFormat,
      ...newUserData,
      conversations: newConversations,
    };

    this.logger.info('[emitData] status', userData?.status);

    this.emit('data', userData);
    this.lastSentIndex = this.conversations.length - 1;
  }

  async runAgentLoop({
    loopWaitTime,
  }: {
    loopWaitTime: (actionType: string) => number;
  }) {
    const { config, logger } = this;
    const { abortController, device, vlm, instruction } = config;

    // init
    this.mode = VlmModeEnum.Agent;
    this.conversations = [
      {
        from: 'human',
        value: instruction,
        timing: {
          start: Date.now(),
          end: Date.now(),
          cost: 0,
        },
      },
    ];
    this.lastSentIndex = this.conversations.length - 1;

    let loopCnt = 0;
    let snapshotErrCnt = 0;

    logger.info('[runAgentLoop] start');

    // start
    this.status = StatusEnum.RUNNING;
    this.emitData();

    try {
      while (true) {
        if (this.status !== StatusEnum.RUNNING) {
          break;
        }

        logger.info(
          '[abortController?.signal?.aborted]',
          abortController?.signal?.aborted,
        );
        if (abortController?.signal?.aborted) {
          this.status = StatusEnum.END;
          this.emitData();
          break;
        }

        loopCnt += 1;
        logger.info(
          `\n=====第 ${loopCnt} 次循环 Start， 截图错误次数: ${snapshotErrCnt} =======\n`,
        );

        // 10 次截图失败
        if (loopCnt >= MAX_LOOP_COUNT || snapshotErrCnt >= 10) {
          this.status = StatusEnum.MAX_LOOP;
          this.emitData({
            errMsg:
              loopCnt >= MAX_LOOP_COUNT
                ? 'Exceeds the maximum number of loops'
                : 'Too many screenshot failures',
          });
          break;
        }

        let start = Date.now();
        // 1、截图
        const snapshot: ScreenshotResult = await retry(
          async () => device.screenshot(),
          {
            retries: 5,
            onRetry: (error, number) => {
              logger.warn(`[snapshot_retry] 调用失败 (${number}/5)`, error);
            },
          },
        );

        const isValidImage = !!(
          snapshot?.base64 &&
          snapshot?.width &&
          snapshot?.height
        );
        logger.info('[isValidImage]', isValidImage);

        if (!isValidImage) {
          loopCnt -= 1;
          snapshotErrCnt += 1;
          continue;
        }

        logger.info(
          '[snapshot] width',
          snapshot.width,
          'height',
          snapshot.height,
        );

        this.addConversation({
          from: 'human',
          value: IMAGE_PLACEHOLDER,
          screenshotBase64: snapshot.base64,
          screenshotContext: {
            size: {
              width: snapshot.width,
              height: snapshot.height,
            },
          },
          timing: {
            start,
            end: Date.now(),
            cost: Date.now() - start,
          },
        });
        this.emitData();
        start = Date.now();

        // 2、vlm 推理
        const vlmParams = {
          ...processVlmParams(this.toVlmModelFormat()),
        };
        logger.info('[vlmParams_conversations]:', vlmParams.conversations);
        logger.info('[vlmParams_images_len]:', vlmParams.images.length);

        const vlmRes = await vlm.invoke(vlmParams, {
          abortController,
        });

        if (!vlmRes?.prediction) {
          continue;
        }

        const { parsed } = await device.nl2Command(vlmRes.prediction);

        let eomImage;
        if (parsed?.length && snapshot) {
          eomImage = await markClickPosition({
            ...snapshot,
            parsed,
          }).catch((e) => {
            logger.error('[markClickPosition error]:', e);
            return '';
          });
        }
        const predictionSummary = getSummary(vlmRes.prediction);
        this.addConversation({
          from: 'gpt',
          value: predictionSummary,
          timing: {
            start,
            end: Date.now(),
            cost: Date.now() - start,
          },
          screenshotContext: {
            size: {
              width: snapshot.width,
              height: snapshot.height,
            },
          },
          screenshotBase64WithElementMarker: eomImage,
          predictionParsed: parsed,
          reflections: vlmRes.reflections,
        });
        this.emitData();

        logger.info('[parsed]', parsed, '[parsed_length]', parsed.length);

        // multiple steps predictions
        for (const prediction of parsed) {
          // 3、根据模型输出判断是否结束 / 执行指令
          const actionType = prediction.action_type;

          logger.info(
            '[parsed_prediction]',
            prediction,
            '[actionType]',
            actionType,
          );

          switch (actionType) {
            case 'error_env':
            case 'call_user':
            case 'finished':
              this.status = StatusEnum.END;
              break;
            case 'max_loop':
              this.status = StatusEnum.MAX_LOOP;
              break;
            default:
              this.status = StatusEnum.RUNNING;
          }
          this.emitData();

          // 4、执行指令
          if (
            !['wait'].includes(actionType) &&
            !abortController?.signal?.aborted
          ) {
            await device.execute(prediction, snapshot.width, snapshot.height);
          }

          await sleep(loopWaitTime?.(actionType) ?? 1500);
        }

        logger.info(`=====第 ${loopCnt} 次循环 End =======\n\n\n`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        logger.info('Request was aborted');
        return;
      }

      logger.error('[runLoop] error', error);
      this.emit('error', {
        ...this.toUserDataFormat(),
        code: -1,
        error: '服务异常',
        stack: `${error}`,
      });
      throw error;
    } finally {
      this.status = StatusEnum.END;
      this.emitData();
      device?.tearDown();
      logger.info('agent finally [this.status]', this.status);
    }
  }

  private toVlmModelFormat(): VlmRequest {
    return {
      conversations: this.conversations.map((conv, idx) => {
        if (idx === 0 && conv.from === 'human') {
          return {
            from: conv.from,
            value: `${this.config.systemPrompt}${conv.value}`,
          };
        }
        return {
          from: conv.from,
          value: conv.value,
        };
      }),
      images: this.conversations
        .filter(
          (conv): conv is Conversation & { screenshotBase64: string } =>
            conv.value === IMAGE_PLACEHOLDER && !!conv.screenshotBase64,
        )
        .map((conv) => conv.screenshotBase64),
    };
  }

  addConversation(conversation: Conversation) {
    this.conversations.push(conversation);
  }
}
