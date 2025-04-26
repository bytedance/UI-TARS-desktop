/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  GUIAgentData,
  UITarsModelVersion,
  StatusEnum,
  ShareVersion,
  ErrorStatusEnum,
} from '@ui-tars/shared/types';
import { IMAGE_PLACEHOLDER, MAX_LOOP_COUNT } from '@ui-tars/shared/constants';
import { sleep } from '@ui-tars/shared/utils';
import asyncRetry from 'async-retry';
import { Jimp } from 'jimp';

import { setContext } from './context/useContext';
import { Operator, GUIAgentConfig } from './types';
import { UITarsModel } from './Model';
import { BaseGUIAgent } from './base';
import {
  getSummary,
  processVlmParams,
  replaceBase64Prefix,
  toVlmModelFormat,
} from './utils';
import {
  INTERNAL_ACTION_SPACES_ENUM,
  MAX_SNAPSHOT_ERR_CNT,
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_TEMPLATE,
} from './constants';

export class GUIAgent<T extends Operator> extends BaseGUIAgent<
  GUIAgentConfig<T>
> {
  private readonly operator: T;
  private readonly model: InstanceType<typeof UITarsModel>;
  private readonly logger: NonNullable<GUIAgentConfig<T>['logger']>;
  private uiTarsVersion?: UITarsModelVersion;
  private systemPrompt: string;

  private isPaused = false;
  private resumePromise: Promise<void> | null = null;
  private resolveResume: (() => void) | null = null;
  private isStopped = false;

  constructor(config: GUIAgentConfig<T>) {
    super(config);
    this.operator = config.operator;

    this.model =
      config.model instanceof UITarsModel
        ? config.model
        : new UITarsModel(config.model);
    this.logger = config.logger || console;
    this.uiTarsVersion = config.uiTarsVersion;
    this.systemPrompt = config.systemPrompt || this.buildSystemPrompt();
  }

  async run(instruction: string) {
    const { operator, model, logger } = this;
    const {
      signal,
      onData,
      onError,
      retry = {},
      maxLoopCount = MAX_LOOP_COUNT,
    } = this.config;

    const currentTime = Date.now();
    const data: GUIAgentData = {
      version: ShareVersion.V1,
      systemPrompt: this.systemPrompt,
      instruction,
      modelName: this.model.modelName,
      status: StatusEnum.INIT,
      logTime: currentTime,
      conversations: [
        {
          from: 'human',
          value: instruction,
          timing: {
            start: currentTime,
            end: currentTime,
            cost: 0,
          },
        },
      ],
    };

    // inject guiAgent config for operator to get
    setContext(
      Object.assign(this.config, {
        logger: this.logger,
        systemPrompt: this.systemPrompt,
        factors: this.model.factors,
        model: this.model,
      }),
    );

    logger.info(
      `[GUIAgent] run:\nsystem prompt: ${this.systemPrompt},\nmodel version: ${this.uiTarsVersion},\nmodel config: ${JSON.stringify(this.model)}`,
    );

    let loopCnt = 0;
    let snapshotErrCnt = 0;

    // start running agent
    data.status = StatusEnum.RUNNING;
    await onData?.({ data: { ...data, conversations: [] } });

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        logger.info('[GUIAgent] loopCnt:', loopCnt);
        // check pause status
        if (this.isPaused && this.resumePromise) {
          data.status = StatusEnum.PAUSE;
          await onData?.({
            data: {
              ...data,
              conversations: [],
            },
          });
          await this.resumePromise;
          data.status = StatusEnum.RUNNING;
          await onData?.({
            data: {
              ...data,
              conversations: [],
            },
          });
        }

        if (
          this.isStopped ||
          (data.status !== StatusEnum.RUNNING &&
            data.status !== StatusEnum.PAUSE) ||
          signal?.aborted
        ) {
          // check if stop or aborted
          signal?.aborted && (data.status = StatusEnum.USER_STOPPED);
          break;
        }

        if (loopCnt >= maxLoopCount || snapshotErrCnt >= MAX_SNAPSHOT_ERR_CNT) {
          Object.assign(data, {
            status:
              loopCnt >= maxLoopCount ? StatusEnum.MAX_LOOP : StatusEnum.ERROR,
            ...(snapshotErrCnt >= MAX_SNAPSHOT_ERR_CNT && {
              error: {
                code: ErrorStatusEnum.SCREENSHOT_ERROR,
                error: 'Too many screenshot failures',
                stack: 'null',
              },
            }),
          });
          break;
        }

        loopCnt += 1;
        const start = Date.now();

        const snapshot = await asyncRetry(() => operator.screenshot(), {
          retries: retry?.screenshot?.maxRetries ?? 0,
          onRetry: retry?.screenshot?.onRetry,
        });

        const { width, height, mime } = await Jimp.fromBuffer(
          Buffer.from(replaceBase64Prefix(snapshot.base64), 'base64'),
        ).catch((e) => {
          logger.error('[GUIAgent] screenshot error', e);
          return {
            width: null,
            height: null,
            mime: '',
          };
        });

        const isValidImage = !!(snapshot?.base64 && width && height);

        if (!isValidImage) {
          loopCnt -= 1;
          snapshotErrCnt += 1;
          await sleep(1000);
          continue;
        }

        let end = Date.now();

        if (isValidImage) {
          data.conversations.push({
            from: 'human',
            value: IMAGE_PLACEHOLDER,
            screenshotBase64: snapshot.base64,
            screenshotContext: {
              size: {
                width,
                height,
              },
              mime,
              scaleFactor: snapshot.scaleFactor,
            },
            timing: {
              start,
              end,
              cost: end - start,
            },
          });
          await onData?.({
            data: {
              ...data,
              conversations: data.conversations.slice(-1),
            },
          });
        }

        // conversations -> messages, images
        const modelFormat = toVlmModelFormat({
          conversations: data.conversations,
          systemPrompt: data.systemPrompt,
        });
        // sliding images window to vlm model
        const vlmParams = {
          ...processVlmParams(modelFormat.conversations, modelFormat.images),
          screenContext: {
            width,
            height,
          },
          mime,
          scaleFactor: snapshot.scaleFactor,
          uiTarsVersion: this.uiTarsVersion,
        };
        const { prediction, parsedPredictions } = await asyncRetry(
          async (bail) => {
            try {
              const result = await model.invoke(vlmParams);
              return result;
            } catch (error: unknown) {
              if (
                error instanceof Error &&
                (error?.name === 'APIUserAbortError' ||
                  error?.message?.includes('aborted'))
              ) {
                bail(error as unknown as Error);
                return {
                  prediction: '',
                  parsedPredictions: [],
                };
              }
              throw error;
            }
          },
          {
            retries: retry?.model?.maxRetries ?? 0,
            onRetry: retry?.model?.onRetry,
          },
        );

        logger.info('[GUIAgent Response]:', prediction);
        logger.info(
          'GUIAgent Parsed Predictions:',
          JSON.stringify(parsedPredictions),
        );

        if (!prediction) {
          logger.error('[GUIAgent Response Empty]:', prediction);
          continue;
        }

        const predictionSummary = getSummary(prediction);

        end = Date.now();
        data.conversations.push({
          from: 'gpt',
          value: predictionSummary,
          timing: {
            start,
            end,
            cost: end - start,
          },
          screenshotContext: {
            size: {
              width,
              height,
            },
            scaleFactor: snapshot.scaleFactor,
          },
          predictionParsed: parsedPredictions,
        });
        await onData?.({
          data: {
            ...data,
            conversations: data.conversations.slice(-1),
          },
        });

        // start execute action
        for (const parsedPrediction of parsedPredictions) {
          const actionType = parsedPrediction.action_type;

          logger.info('GUIAgent Action:', actionType);

          // handle internal action spaces
          if (actionType === INTERNAL_ACTION_SPACES_ENUM.ERROR_ENV) {
            Object.assign(data, {
              status: StatusEnum.ERROR,
              error: {
                code: ErrorStatusEnum.ENVIRONMENT_ERROR,
                error: 'The environment error occurred when parsing the action',
                stack: 'null',
              },
            });
            break;
          } else if (actionType === INTERNAL_ACTION_SPACES_ENUM.MAX_LOOP) {
            data.status = StatusEnum.MAX_LOOP;
            break;
          }

          if (!signal?.aborted && !this.isStopped) {
            logger.info(
              'GUIAgent Action Inputs:',
              parsedPrediction.action_inputs,
              parsedPrediction.action_type,
            );
            // TODO: pass executeOutput to onData
            const executeOutput = await asyncRetry(
              () =>
                operator.execute({
                  prediction,
                  parsedPrediction,
                  screenWidth: width,
                  screenHeight: height,
                  scaleFactor: snapshot.scaleFactor,
                  factors: this.model.factors,
                }),
              {
                retries: retry?.execute?.maxRetries ?? 0,
                onRetry: retry?.execute?.onRetry,
              },
            ).catch((e) => {
              logger.error('GUIAgent execute error', e);
            });

            if (executeOutput && executeOutput?.status) {
              data.status = executeOutput.status;
            }
          }

          // Action types must break the loop after operator execution:
          if (actionType === INTERNAL_ACTION_SPACES_ENUM.CALL_USER) {
            data.status = StatusEnum.CALL_USER;
            break;
          } else if (actionType === INTERNAL_ACTION_SPACES_ENUM.FINISHED) {
            data.status = StatusEnum.END;
            break;
          }
        }

        if (this.config.loopIntervalInMs && this.config.loopIntervalInMs > 0) {
          logger.info(
            `[GUIAgent] sleep for ${this.config.loopIntervalInMs}ms before next loop`,
          );
          await sleep(this.config.loopIntervalInMs);
          logger.info(
            `[GUIAgent] sleep for ${this.config.loopIntervalInMs}ms before next loop done`,
          );
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        logger.info('Request was aborted');
        data.status = StatusEnum.USER_STOPPED;
        return;
      }

      logger.error('[GUIAgent] run error', error);
      data.status = StatusEnum.ERROR;
      data.error = {
        code: ErrorStatusEnum.EXECUTE_ERROR,
        error: 'GUIAgent Service Error',
        stack: `${error}`,
      };
      throw error;
    } finally {
      if (data.status === StatusEnum.USER_STOPPED) {
        await operator.execute({
          prediction: '',
          parsedPrediction: {
            action_inputs: {},
            reflection: null,
            action_type: 'user_stop',
            thought: '',
          },
          screenWidth: 0,
          screenHeight: 0,
          scaleFactor: 1,
          factors: [0, 0],
        });
      }
      await onData?.({ data: { ...data, conversations: [] } });
      if (data.status === StatusEnum.ERROR) {
        onError?.({
          data,
          error: data.error || {
            code: ErrorStatusEnum.UNKNOWN_ERROR,
            error: 'Unkown error occurred',
            stack: 'null',
          },
        });
      }
      logger.info('[GUIAgent] finally: status', data.status);
    }
  }

  public pause() {
    this.isPaused = true;
    this.resumePromise = new Promise((resolve) => {
      this.resolveResume = resolve;
    });
  }

  public resume() {
    if (this.resolveResume) {
      this.resolveResume();
      this.resumePromise = null;
      this.resolveResume = null;
    }
    this.isPaused = false;
  }

  public stop() {
    this.isStopped = true;
  }

  private buildSystemPrompt() {
    const actionSpaces = (this.operator.constructor as typeof Operator)?.MANUAL
      ?.ACTION_SPACES;

    return actionSpaces == null || actionSpaces.length === 0
      ? SYSTEM_PROMPT
      : SYSTEM_PROMPT_TEMPLATE.replace(
          '{{action_spaces_holder}}',
          actionSpaces.join('\n'),
        );
  }
}
