/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Message,
  GUIAgentData,
  PredictionParsed,
  ScreenshotResult,
  StatusEnum,
} from '@ui-tars/shared/types';

import { BaseOperator, BaseModel } from './base';
import { UITarsModel } from './Model';

export interface ExecuteParams {
  prediction: string;
  parsedPrediction: PredictionParsed;
  /** Device Physical Resolution */
  screenWidth: number;
  /** Device Physical Resolution */
  screenHeight: number;
  /** Device DPR */
  scaleFactor: number;
}

export type ExecuteOutput = { status: StatusEnum } & (object | void);

export interface ScreenshotOutput extends ScreenshotResult {}

export interface InvokeParams {
  conversations: Message[];
  images: string[];
}

export interface InvokeOutput {
  prediction: string;
  parsedPredictions: PredictionParsed[];
  // TODO: status: StatusEnum, status should be provided by model
}
export abstract class Operator extends BaseOperator {
  static MANUAL: {
    ACTION_SPACES: string[];
    EXAMPLES?: string[];
  };
  abstract screenshot(): Promise<ScreenshotOutput>;
  abstract execute(params: ExecuteParams): Promise<ExecuteOutput>;
}

export abstract class Model extends BaseModel<InvokeParams, InvokeOutput> {
  abstract invoke(params: InvokeParams): Promise<InvokeOutput>;
}

export type Logger = Pick<Console, 'log' | 'error' | 'warn' | 'info'>;

export interface RetryConfig {
  maxRetries: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface GUIAgentError {
  // TODO: define error code
  code: number;
  error: string;
  stack?: string;
}

export interface GUIAgentConfig<TOperator> {
  operator: TOperator;
  model:
    | InstanceType<typeof UITarsModel>
    | ConstructorParameters<typeof UITarsModel>[0];

  // ===== Optional =====
  systemPrompt?: string;
  signal?: AbortSignal;
  onData?: (params: { data: GUIAgentData }) => void;
  onError?: (params: { data: GUIAgentData; error: GUIAgentError }) => void;
  logger?: Logger;
  retry?: {
    model?: RetryConfig;
    /** TODO: whether need to provider retry config in SDK?, should be provided with operator? */
    screenshot?: RetryConfig;
    execute?: RetryConfig;
  };
  /** Maximum number of turns for Agent to execute, @default 25 */
  maxLoopCount?: number;
}

export interface AgentContext<T = Operator> extends GUIAgentConfig<T> {
  logger: NonNullable<GUIAgentConfig<T>['logger']>;
  /** [widthFactor, heightFactor] */
  factors: [number, number];
  model: InstanceType<typeof UITarsModel>;
}
