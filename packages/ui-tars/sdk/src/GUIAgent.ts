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
  GUIAgentError,
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
import { InternalServerError } from 'openai';

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
    let totalTokens = 0;
    let totalTime = 0;

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

        if (loopCnt >= maxLoopCount) {
          Object.assign(data, {
            status: StatusEnum.ERROR,
            error: this.guiAgentErrorParser(
              ErrorStatusEnum.REACH_MAXLOOP_ERROR,
            ),
          });
          break;
        }

        if (snapshotErrCnt >= MAX_SNAPSHOT_ERR_CNT) {
          Object.assign(data, {
            status: StatusEnum.ERROR,
            error: this.guiAgentErrorParser(
              ErrorStatusEnum.SCREENSHOT_RETRY_ERROR,
            ),
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
        const { prediction, parsedPredictions, costTime, costTokens } =
          await asyncRetry(
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

                Object.assign(data, {
                  status: StatusEnum.ERROR,
                  error: this.guiAgentErrorParser(
                    ErrorStatusEnum.INVOKE_RETRY_ERROR,
                    error as Error,
                  ),
                });

                return {
                  prediction: '',
                  parsedPredictions: [],
                };
              }
            },
            {
              retries: retry?.model?.maxRetries ?? 0,
              onRetry: retry?.model?.onRetry,
            },
          );

        totalTokens += costTokens || 0;
        totalTime += costTime || 0;

        logger.info(
          `[GUIAgent] consumes: >>> costTime: ${costTime}, costTokens: ${costTokens} <<<`,
        );
        logger.info('[GUIAgent] Response:', prediction);
        logger.info(
          '[GUIAgent] Parsed Predictions:',
          JSON.stringify(parsedPredictions),
        );

        if (!prediction) {
          logger.error('[GUIAgent] Response Empty:', prediction);
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

          logger.info('[GUIAgent] Action:', actionType);

          // handle internal action spaces
          if (actionType === INTERNAL_ACTION_SPACES_ENUM.ERROR_ENV) {
            Object.assign(data, {
              status: StatusEnum.ERROR,
              error: this.guiAgentErrorParser(
                ErrorStatusEnum.ENVIRONMENT_ERROR,
              ),
            });
            break;
          } else if (actionType === INTERNAL_ACTION_SPACES_ENUM.MAX_LOOP) {
            Object.assign(data, {
              status: StatusEnum.ERROR,
              error: this.guiAgentErrorParser(
                ErrorStatusEnum.REACH_MAXLOOP_ERROR,
              ),
            });
            break;
          }

          if (!signal?.aborted && !this.isStopped) {
            logger.info(
              '[GUIAgent] Action Inputs:',
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
              logger.error('[GUIAgent] execute error', e);
              Object.assign(data, {
                status: StatusEnum.ERROR,
                error: this.guiAgentErrorParser(
                  ErrorStatusEnum.EXECUTE_RETRY_ERROR,
                  e,
                ),
              });
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
      logger.error('[GUIAgent] Catch error', error);
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        logger.info('[GUIAgent] Catch: request was aborted');
        data.status = StatusEnum.USER_STOPPED;
        return;
      }

      data.status = StatusEnum.ERROR;
      data.error = this.guiAgentErrorParser(
        ErrorStatusEnum.UNKNOWN_ERROR,
        error as Error,
      );

      // We only use OnError callback to dispatch error information to caller,
      // and we will not throw error to the caller.
      // throw error;
    } finally {
      logger.info('[GUIAgent] Finally: status', data.status);

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
          error:
            data.error ||
            new GUIAgentError(
              ErrorStatusEnum.UNKNOWN_ERROR,
              'Unknown error occurred',
            ),
        });
      }

      logger.info(
        `[GUIAgent] >>> totalTokens: ${totalTokens}, totalTime: ${totalTime}, loopCnt: ${loopCnt} <<<`,
      );
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

  private guiAgentErrorParser(
    type: ErrorStatusEnum,
    error?: Error,
  ): GUIAgentError {
    this.logger.error('[GUIAgent] guiAgentErrorParser:', error);

    let parseError = null;

    if (error instanceof InternalServerError) {
      this.logger.error(
        '[GUIAgent] guiAgentErrorParser instanceof InternalServerError.',
      );
      parseError = new GUIAgentError(
        ErrorStatusEnum.MODEL_SERVICE_ERROR,
        error.message,
        error.stack,
      );
    }

    if (!parseError && type === ErrorStatusEnum.REACH_MAXLOOP_ERROR) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.REACH_MAXLOOP_ERROR,
        `Has reached max loop count: ${error?.message || ''}`,
        error?.stack,
      );
    }

    if (!parseError && type === ErrorStatusEnum.SCREENSHOT_RETRY_ERROR) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.SCREENSHOT_RETRY_ERROR,
        `Too many screenshot failures: ${error?.message || ''}`,
        error?.stack,
      );
    }

    if (!parseError && type === ErrorStatusEnum.INVOKE_RETRY_ERROR) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.INVOKE_RETRY_ERROR,
        `Too many model invoke failures: ${error?.message || ''}`,
        error?.stack,
      );
    }

    if (!parseError && type === ErrorStatusEnum.EXECUTE_RETRY_ERROR) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.EXECUTE_RETRY_ERROR,
        `Too many action execute failures: ${error?.message || ''}`,
        error?.stack,
      );
    }

    if (!parseError && type === ErrorStatusEnum.ENVIRONMENT_ERROR) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.ENVIRONMENT_ERROR,
        `The environment error occurred when parsing the action: ${error?.message || ''}`,
        error?.stack,
      );
    }

    if (!parseError) {
      parseError = new GUIAgentError(
        ErrorStatusEnum.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error.stack || 'null' : 'null',
      );
    }

    if (!parseError.stack) {
      // Avoid guiAgentErrorParser it self in stack trace
      Error.captureStackTrace(parseError, this.guiAgentErrorParser);
    }

    return parseError;
  }
}
