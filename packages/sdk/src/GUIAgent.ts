/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GUIAgentData, StatusEnum, ShareVersion } from '@ui-tars/shared/types';
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
} from './constants';

export class GUIAgent<T extends Operator> extends BaseGUIAgent<
  GUIAgentConfig<T>
> {
  private readonly operator: T;
  private readonly model: InstanceType<typeof UITarsModel>;
  private readonly logger: NonNullable<GUIAgentConfig<T>['logger']>;
  private systemPrompt: string;

  constructor(config: GUIAgentConfig<T>) {
    super(config);
    this.operator = config.operator;

    this.model =
      config.model instanceof UITarsModel
        ? config.model
        : new UITarsModel(config.model);
    this.logger = config.logger || console;
    this.systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
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

    let loopCnt = 0;
    let snapshotErrCnt = 0;

    // start running agent
    data.status = StatusEnum.RUNNING;
    await onData?.({ data: { ...data, conversations: [] } });

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        console.log('[run_data_status]', data.status);

        if (data.status !== StatusEnum.RUNNING || signal?.aborted) {
          signal?.aborted && (data.status = StatusEnum.END);
          await onData?.({ data: { ...data, conversations: [] } });
          break;
        }

        if (loopCnt >= maxLoopCount || snapshotErrCnt >= MAX_SNAPSHOT_ERR_CNT) {
          Object.assign(data, {
            status: StatusEnum.MAX_LOOP,
            errMsg:
              loopCnt >= maxLoopCount
                ? 'Exceeds the maximum number of loops'
                : 'Too many screenshot failures',
          });
          await onData?.({ data: { ...data, conversations: [] } });
          break;
        }

        loopCnt += 1;
        const start = Date.now();

        const snapshot = await asyncRetry(() => operator.screenshot(), {
          retries: retry?.screenshot?.maxRetries ?? 0,
          onRetry: retry?.screenshot?.onRetry,
        });

        const { width, height } = await Jimp.fromBuffer(
          Buffer.from(replaceBase64Prefix(snapshot.base64), 'base64'),
        ).catch((e) => {
          logger.error('[GUIAgent] screenshot error', e);
          return {
            width: null,
            height: null,
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
          if (
            [
              INTERNAL_ACTION_SPACES_ENUM.CALL_USER,
              INTERNAL_ACTION_SPACES_ENUM.ERROR_ENV,
              INTERNAL_ACTION_SPACES_ENUM.FINISHED,
            ].includes(actionType as unknown as INTERNAL_ACTION_SPACES_ENUM)
          ) {
            data.status = StatusEnum.END;
            break;
          } else if (actionType === INTERNAL_ACTION_SPACES_ENUM.MAX_LOOP) {
            data.status = StatusEnum.MAX_LOOP;
            break;
          }

          if (!signal?.aborted) {
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
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        logger.info('Request was aborted');
        return;
      }

      logger.error('[GUIAgent] run error', error);
      onError?.({
        data,
        error: {
          code: -1,
          error: 'GUIAgent Service Error',
          stack: `${error}`,
        },
      });
      throw error;
    } finally {
      const prevStatus = data.status;
      data.status = StatusEnum.END;

      if (data.status !== prevStatus) {
        await onData?.({
          data: {
            ...data,
            conversations: [],
          },
        });
      }

      logger.info('[GUIAgent] finally: status', data.status);
    }
  }
}
